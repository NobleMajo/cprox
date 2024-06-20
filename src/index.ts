import { parseCmd } from "cmdy"
import root from "./cmd/root"

export default parseCmd(root)
    .exe()
    .catch((err: Error | any) => console.error(
        "# CProX Error #\n", err
    ))