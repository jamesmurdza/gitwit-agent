import { cli } from "./cli";
import * as dotenv from "dotenv"

dotenv.config();


(async () => {
    await cli();
})().catch((err: any) => {
    console.error(err)
    process.exit(1)
    })