# typenvy

![CI/CD](https://github.com/majo418/typenvy/workflows/Publish/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Ftypenvy%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/typenvy.svg?style=plastic&logo=npm&color=red)
![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Ftypenvy%2Fmain%2Fpackage.json)

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ftypenvy)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ftypenvy)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ftypenvy)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ftypenvy)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Ftypenvy)

# table of contents 
- [typenvy](#typenvy)
- [table of contents](#table-of-contents)
- [About](#about)
  - [Getting started](#getting-started)
- [other functions](#other-functions)
- [npm scripts](#npm-scripts)
  - [use](#use)
  - [base scripts](#base-scripts)
  - [watch mode](#watch-mode)
- [contribution](#contribution)

# About 
`typenvy` is a environment managment library.

## Getting started
### 1. install typenvy
```sh
npm i typenvy
```

### 2. env file
Create a example environment file at `./src/env/env.ts`:
```ts
import * as typenvy from "typenvy"
export const envDefaults = {
    PRODUCTION: (process.env.NODE_ENV === "production") as boolean,
    VERBOSE: false as boolean,

    PORT: 8080 as number,
    API_KEY: undefined as string,
    API_URL: undefined as string,
}
export const envTypes: typenvy.VariablesTypes = {
    PRODUCTION: [typenvy.TC_BOOLEAN],
    VERBOSE: [typenvy.TC_BOOLEAN],

    PORT: [typenvy.TC_NUMBER],
    API_KEY: [typenvy.TC_STRING],
    API_URL: [typenvy.TC_STRING],
}
``` 

### 3. env parser
Create a example environment parser file at `./src/env/envParser.ts`:
```ts
import { parseEnv } from "typenvy"
import { envDefaults, envTypes } from "./env"

export const env = parseEnv(
  envDefaults,
  envTypes
)
  .setProcessEnv()
  .errExit()
  .env
export default env
```

### 4. load and print env in "./src/index.ts"
```ts
import env from "./env/envParser"

console.log("parser env: ", env)
console.log("process env: ", process.env)
```

### 5. start and error
If you run the `index.js` after compile the app throws an error.  
This is because in the `env.ts` there is no default value provided for `API_KEY` and `API_URL`.

There are 3 options to remove this error:

#### 1. Set environment variables
Define the variables in your shell:
```sh
export API_KEY="qwertzui"
export API_URL="https://api.github.io/v2/repo/majo418/testrepo"
```
#### 2. Allow undefined as value
Allow undefined as environment variable value in `env.ts`:
```ts
export const variablesTypes: typenvy.VariablesTypes = {
    PRODUCTION: [typenvy.TC_BOOLEAN],
    VERBOSE: [typenvy.TC_BOOLEAN],

    PORT: [typenvy.TC_NUMBER],
    API_KEY: [typenvy.TC_STRING, typenvy.TC_UNDEFINED], // <---
    API_URL: [typenvy.TC_STRING, typenvy.TC_UNDEFINED], // <---
}
```
#### 3. Set a default value
Allow default environment values in `envParser.ts`:
```ts
export const defaultEnv = {
    PRODUCTION: (process.env.NODE_ENV === "production") as boolean,
    VERBOSE: false as boolean,

    PORT: 8080 as number,
    API_KEY: "myDEfaultAPIkey" as string,
    API_URL: "https://api.cloudflare.com/v1/dns" as string,
}
```

# other functions
By using the `parseEnv()` function tou get a `EnvResult<T>`.
Here are all function of the Environment Result:
```ts
export interface EnvResult<T> {
  // Overwrite default values
  overwriteEnv(
    env: { [key: string]: any }
  ): EnvResult<T>
  // Set value if its missing in default values
  setMissingEnv(
    env: { [key: string]: any }
  ): EnvResult<T>
  // Put all env value as strings into process.env
  setProcessEnv(): EnvResult<T>
  // Clear all env values from process.env
  clearProcessEnv(
    justEqualValues: boolean = true
  ): EnvResult<T>
  // Print env errors to console
  errPrint(): EnvResult<T> 
  // Throw env errors
  errThrow(): EnvResult<T>
  // Exit on error
  errExit(
    exitCode: number = 1
  ): EnvResult<T> | never
}
```

# npm scripts
The npm scripts are made for linux but can also work on mac and windows.
## use
You can run npm scripts in the project folder like this:
```sh
npm run <scriptname>
```
Here is an example:
```sh
npm run test
```

## base scripts
You can find all npm scripts in the `package.json` file.
This is a list of the most important npm scripts:
 - test // test the app
 - build // build the app
 - exec // run the app
 - start // build and run the app

## watch mode
Like this example you can run all npm scripts in watch mode:
```sh
npm run start:watch
```

# contribution
 - 1. fork the project
 - 2. implement your idea
 - 3. create a pull/merge request
```ts
// please create seperated forks for different kind of featues/ideas/structure changes/implementations
```

---
**cya ;3**  
*by majo418*