import https from "https";
import http from "http";

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
export const axios_config = { httpAgent, httpsAgent };
