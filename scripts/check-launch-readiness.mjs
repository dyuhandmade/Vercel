import nextEnv from '@next/env';
import {inspectLaunchEnvironment} from './lib/launch-readiness.mjs';

// Match Next production dotenv precedence; never output loaded values.
nextEnv.loadEnvConfig(process.cwd(), false, {info() {}, error() {}});
const result = inspectLaunchEnvironment(process.env);
console.log(JSON.stringify(result, null, 2));
if (!result.configurationReady) process.exitCode = 1;
