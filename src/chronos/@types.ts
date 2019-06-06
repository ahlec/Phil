import { Moment } from 'moment';
import Feature from '../features/feature';
import Phil from '../phil';
import ServerConfig from '../server-config';

export default interface Chrono {
  readonly handle: string;
  readonly requiredFeature: Feature | null;

  process(phil: Phil, serverConfig: ServerConfig, now: Moment): Promise<void>;
}

export { default as Logger } from '../Logger';
export { default as LoggerDefinition } from '../LoggerDefinition';
