import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { config } from '../../config';
import { sparqlClient, REGISTRY_GRAPH } from '../../lib/graphdb';

export interface AuthUser {
  userId: string;
  githubId: string;
  githubLogin: string;
  avatarUrl?: string;
  displayName?: string;
}

async function upsertUser(profile: {
  id: string;
  username?: string;
  displayName?: string;
  photos?: Array<{ value: string }>;
}): Promise<AuthUser> {
  const githubId = profile.id;
  const userId = `urn:ontohub:user:${githubId}`;
  const githubLogin = profile.username ?? '';
  const displayName = profile.displayName ?? githubLogin;
  const avatarUrl = profile.photos?.[0]?.value ?? '';
  const now = new Date().toISOString();
  const githubProfileUri = `https://github.com/${githubLogin}`;

  const updateQuery = `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

DELETE {
  GRAPH <${REGISTRY_GRAPH}> {
    <${userId}> foaf:name ?name ;
                foaf:account ?account .
  }
}
INSERT {
  GRAPH <${REGISTRY_GRAPH}> {
    <${userId}>
      a foaf:Person ;
      foaf:account <${githubProfileUri}> ;
      foaf:name "${displayName.replace(/"/g, '\\"')}" ;
      foaf:depiction <${avatarUrl}> ;
      dcterms:identifier "${githubId}" ;
      dcterms:created "${now}"^^xsd:dateTime .
  }
}
WHERE {
  OPTIONAL {
    GRAPH <${REGISTRY_GRAPH}> {
      <${userId}> foaf:name ?name ;
                  foaf:account ?account .
    }
  }
}`;

  await sparqlClient.query.update(updateQuery);

  return { userId, githubId, githubLogin, avatarUrl, displayName };
}

passport.use(
  new GitHubStrategy(
    {
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: config.github.callbackUrl,
    },
    async (_accessToken: string, _refreshToken: string, profile: Parameters<typeof upsertUser>[0], done: (err: Error | null, user?: AuthUser) => void) => {
      try {
        const user = await upsertUser(profile);
        done(null, user);
      } catch (err) {
        done(err instanceof Error ? err : new Error(String(err)));
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user as AuthUser);
});

passport.deserializeUser((user, done) => {
  done(null, user as AuthUser);
});
