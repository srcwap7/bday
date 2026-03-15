import fs from "fs";
import yaml from "js-yaml";

export default function loadSearchConfig() {
    const fileContents = fs.readFileSync("./preferences.yaml", "utf8");
    const data = yaml.load(fileContents);
    return data;
}

