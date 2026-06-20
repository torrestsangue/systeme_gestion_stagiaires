
import path from "path";
import yaml from "js-yaml";
import fs from "fs";
 
//  Lire le fichier swagger.yaml
const swaggerDocument = yaml.load(
  fs.readFileSync(
    path.join(process.cwd(),"src/swagger.yaml"),
    "utf8")
) as object;
 
export const swaggerSpec = swaggerDocument;