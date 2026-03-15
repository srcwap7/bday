import dotenv from "dotenv";
dotenv.config({ path: "config.env" });

class McpWrapper{
    constructor(mcpClient){
        this.client = mcpClient;
        this.max_retry_count = process.env.MAX_RETRY_COUNT;
        this.multiplicative_factor = process.env.MULTIPLICATIVE_FACTOR;
        this.initial_delay = process.env.INITIAL_DELAY;
    }

    async call(params) {
        for (let trial = 0; trial < this.max_retry_count; trial++) {
            try {
                const curr_delay = trial ? this.initial_delay * Math.pow(this.multiplicative_factor, trial) : 0;
                await new Promise(resolve =>setTimeout(resolve, 1000 * curr_delay));
                const result = await this.client.callTool(params);
                if (result.isError === false && result?.content?.[0]) {
                    if (result.content[0].text){
                        const data = JSON.parse(result.content[0].text);
                        return data;
                    }
                    else if (result.content[0].data){
                        return result.content[0].data
                    }
                }
            } 
            catch (error) {
                console.log("Function call failed", error);
            }
        }

        throw new Error("No of Retries exceeded");
    }
}

export default McpWrapper;