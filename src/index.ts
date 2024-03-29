import { depPath } from '../dep.ts'
import { TFunction, TTypeData } from './types.ts'

export const getReader = (abstract: Deno.FsFile | Response) => {
    try {
        if (abstract instanceof Deno.FsFile) return abstract.readable.getReader()
        return abstract.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>
    } catch (error) {
        console.log(error);
    }
}

export const readLinesWithReader = async function* (path: string) {
    let abstract: Deno.FsFile | Response;

    if (typePath(path).type === "system") {
        abstract = await Deno.open(path, {
            read: true,
        })
    } else {
        abstract = await fetch(path);
    }

    const decoder = new TextDecoder()
    const reader = getReader(abstract);

    if (!reader) throw Error("");

    let { value: chunk, done: readerDone } = await reader.read()

    let chunkDecode = chunk ? decoder.decode(chunk) : ''

    const regExp: RegExp = /\r?\n/g

    let startIndex = 0

    while (1) {
        const result = regExp.exec(chunkDecode)

        if (result === null) {
            if (readerDone === true) {
                break
            }

            const remainder = chunkDecode.substring(startIndex)
                ; ({ value: chunk, done: readerDone } = await reader.read())

            chunkDecode = remainder + (chunkDecode ? decoder.decode(chunk) : '')
            startIndex = 0
            continue
        }

        yield chunkDecode.substring(startIndex, result.index)
        startIndex = regExp.lastIndex
    }

    if (startIndex < chunkDecode.length) {
        yield chunkDecode.substring(startIndex)
    }
}

export const readLinesWithRead = async function* (path: string) {
    using file = await Deno.open(path, {
        read: true,
    })

    const decoder = new TextDecoder()
    let finish = false
    let buffer = new Uint8Array(10000)
    let numberOfBytesRead = await file.read(buffer)

    let chunkDecode = numberOfBytesRead ? decoder.decode(buffer) : ''

    const regExp: RegExp = /\r?\n/g

    let startIndex = 0

    while (1) {
        const result = regExp.exec(chunkDecode)

        if (result === null) {
            if (finish === true) {
                break
            }

            const remainder = chunkDecode.substring(startIndex)
            buffer = new Uint8Array(10000)
            numberOfBytesRead = await file.read(buffer)

            chunkDecode = remainder +
                (numberOfBytesRead ? decoder.decode(buffer) : '')
            startIndex = 0

            if (!numberOfBytesRead) finish = true

            continue
        }

        yield chunkDecode.substring(startIndex, result.index)
        startIndex = regExp.lastIndex
    }

    if (startIndex < chunkDecode.length) {
        yield chunkDecode.substring(startIndex)
    }
}

export const readLines = (path: string) => {
    if (typePath(path).type === "system") return readLinesWithRead(path)
    else return readLinesWithReader(path)
}

export const convertTextToArray = (text: string) => {
    try {
        return eval(text)
    } catch (error) {
        error
        return text
    }
}

export const convertTextToJson = (text: string) => {
    try {
        return JSON.parse(text)
    } catch (error) {
        error
        return text
    }
}

export const convertTextToExpression = (expression: any) => {
    if (expression.startsWith('[') && expression.endsWith(']')) {
        return convertTextToArray(expression)
    }
    if (expression.startsWith('{') && expression.endsWith('}')) {
        return convertTextToJson(expression)
    }
    if (expression === 'undefined') return undefined
    if (expression === 'null') return null
    if (expression === 'true' || expression === 'false') {
        return Boolean(expression)
    }
    if (isNaN(Number(expression))) return String(expression)
    return Number(expression)
}

export const convertExpressionToText = (
    expression: string | number | boolean | object | Array<any> | TFunction,
) => {
    if (typeof expression === 'string') return `"${expression}"`
    if (typeof expression === 'number') return `${expression}`
    if (typeof expression === 'boolean') return `${expression}`
    if (typeof expression === 'object' || Array.isArray(expression)) {
        return JSON.stringify(expression)
    }
    if (typeof expression === 'function') return `${expression}`

    return expression
}

export const variableDump = (expression: any, depth = 10) => {
    const seen = new Set()

    const inspect = (object: any, depth: number): string => {
        if (depth === 0) return '...'

        if (object === null) return 'null'

        if (object === undefined) return 'undefined'

        if (typeof object === 'string') return `"${object}"`

        if (typeof object === 'number' || typeof object === 'boolean') {
            return object.toString()
        }

        if (typeof object === 'function') return `[Function: ${object.name}]`

        if (Array.isArray(object)) {
            if (seen.has(object)) return '[Circular]'

            seen.add(object)

            const items = object.map((item) => inspect(item, depth - 1))

            seen.delete(object)

            return `[${items.join(', ')}]`
        }

        if (typeof object === 'object') {
            if (seen.has(object)) return '[Circular]'

            seen.add(object)

            const items = Object.entries(object).map(([key, value]) => {
                return `${key}: ${inspect(value, depth - 1)}`
            })

            seen.delete(object)

            return `{ ${items.join(', ')} }`
        }

        return ''
    }

    return inspect(expression, depth)
}

export const isset = (accessor: any) =>
    typeof accessor !== 'undefined' && accessor !== null

export const empty = (accessor: any) =>
    typeof accessor === 'undefined' || accessor === null || accessor === ''

export const unless = (accessor: any) => !accessor

export const isURL = (url: string) =>
    /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i
        .test(
            url,
        )

export const typePath = (path: string) => {
    if (!URL.canParse(path)) return {
        path,
        type: "system"
    }

    const protocol = new URL(path).protocol.slice(0, -1);

    if (protocol === "https" || protocol === "http" || protocol === "ws" || protocol === "ftp" || protocol === "tcp") return {
        path,
        type: "url"
    }

    return {
        path,
        type: "system"
    }
}

export const isClass = (abstract: any) =>
    typeof abstract === 'function' &&
        abstract.toString().indexOf('class') !== -1
        ? true
        : false

export const getFullPath = (
    path: string,
    relative = false,
    isImport = false,
) => {
    path = path.startsWith('/') ? path : `/${path}`
    path = path.replace(/\\/g, '/')

    if (relative) return path

    if (isImport) return depPath.toFileUrl(`${Deno.cwd()}${path}`).toString()
    return `${Deno.cwd()}${path}`
}

export const removePlural = (word: string) => {
    const irregulars: any[][] = [
        ['children', 'child'],
        ['people', 'person'],
        ['potatoes', 'potato'],
        ['tomatoes', 'tomato'],
        ['(.*)ies$', '$1y'],
        [
            '(.*)ves$',
            (_: any, p1: string) => {
                if (['leaf', 'knife', 'life', 'wife'].includes(p1)) {
                    return p1 + 'e'
                } else {
                    return p1 + 'f'
                }
            },
        ],
        ['(.*)([csx])es$', '$1$2'],
        ['(.*)([^s])s$', '$1$2'],
    ]

    for (const [plural, singular] of irregulars) {
        const regex = new RegExp(plural, 'i')
        if (regex.test(word)) {
            return word.replace(regex, singular)
        }
    }

    return word
}

export const validateType = (expression: any, type: TTypeData) => {
    const validators: Record<string, TFunction> = {
        string: (value: any) => typeof value === 'string',
        number: (value: any) => typeof value === 'number',
        array: (value: any) => Array.isArray(value),
        object: (value: any) => typeof value === 'object',
        boolean: (value: any) => typeof value === 'boolean',
        null: (value: any) => value === null,
        undefined: (value: any) => value === undefined,
        map: (value: any) => value instanceof Map,
        set: (value: any) => value instanceof Set,
        date: (value: any) => value instanceof Date,
        regExp: (value: any) => value instanceof RegExp,
        uint8Array: (value: any) => value instanceof Uint8Array,
        bigint: (value: any) => typeof value === 'bigint',
    }

    if (Array.isArray(type)) {
        type.forEach((type: any) => {
            if (!validators[type](expression)) {
                throw new Deno.errors.InvalidData(
                    `the value (${expression}) is not of this type ${type.toUpperCase()}`,
                )
            }
        })
    } else if (!validators[type](expression)) {
        throw new Deno.errors.InvalidData(
            `the value (${expression}) is not of this type ${type.toUpperCase()}`,
        )
    }
}
