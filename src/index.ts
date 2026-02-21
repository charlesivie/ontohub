import './contexts/auth/passport'; // side-effect: configures passport strategies
import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Ontohub backend listening on port ${config.port} (${config.nodeEnv})`);
});
