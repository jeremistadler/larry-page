import {generateChronologicalId} from './generateChronologicalId'
import {DNA_HEADER_BYTES, encodeDna, encodeDnaList, decodeDna} from 'shared/src/dna'
import {Utils} from 'shared/src/utils'

export interface Env {
  KV: KVNamespace
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': 'http://localhost:1234',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-Dna-Id',
}

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'content-type': 'application/json',
}

const BINARY_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'content-type': 'application/octet-stream',
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: CORS_HEADERS})
    }

    if (url.protocol === 'http:') {
      return Response.redirect(request.url.replace('http:', 'https:'), 301)
    }

    if (url.pathname.includes('/api')) {
      const params: Record<string, string> = {}
      url.searchParams.forEach((v, k) => (params[k] = v))
      return handleApiRequest(request, env, ctx, params)
    }

    return new Response('Not Found', {status: 404})
  },
} satisfies ExportedHandler<Env>

function readFitnessFromDnaBytes(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getFloat64(0, true)
}

function readRenderSizeFromDnaBytes(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getUint32(20, true)
}

function fitnessKey(id: string, renderSize: number, fitness: number): string {
  return (
    'fitness4:' +
    id +
    ':' +
    (99999 - renderSize).toString().padStart(5, '0') +
    ':' +
    formatFitnessChronological(fitness)
  )
}

async function handleApiRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  query: Record<string, string>,
): Promise<Response> {
  const {KV} = env

  if (query.route === 'upload') {
    const buf = await request.arrayBuffer()
    const id = generateChronologicalId()
    const dna = Utils.createDna(1, id)
    const encoded = encodeDna(dna)

    await KV.put('image:' + id, buf)
    await KV.put(
      fitnessKey(id, dna.renderSize, dna.fitness),
      encoded as unknown as ArrayBuffer,
    )
    await KV.put('dnaIds:' + id, id)
    await updateDnaCurrentList(KV)

    return new Response(encoded, {
      headers: {...BINARY_HEADERS, 'x-dna-id': id},
    })
  } else if (query.route === 'dna') {
    const dnaId = query.id
    const bytes = await getFittestDnaBytesById(KV, dnaId)
    if (bytes) {
      await KV.put('lastReturnedId', dnaId)
      return new Response(bytes, {
        headers: {...BINARY_HEADERS, 'x-dna-id': dnaId},
      })
    }
    return new Response(JSON.stringify({errorMessage: 'No dna found'}), {
      status: 404,
      headers: JSON_HEADERS,
    })
  } else if (query.route === 'random') {
    const dnaIds =
      ((await KV.get('dnaIdsList', 'json')) as string[] | null) ?? []
    if (dnaIds.length === 0) {
      return new Response(JSON.stringify({errorMessage: 'No dna found'}), {
        status: 404,
        headers: JSON_HEADERS,
      })
    }
    const lastReturnedId = await KV.get('lastReturnedId', 'text')
    let index = (dnaIds.indexOf(lastReturnedId ?? '') + 1) % dnaIds.length

    for (let i = 0; i < dnaIds.length; i++) {
      const dnaId = dnaIds[index]
      const bytes = await getFittestDnaBytesById(KV, dnaId)
      if (bytes) {
        await KV.put('lastReturnedId', dnaId)
        return new Response(bytes, {
          headers: {...BINARY_HEADERS, 'x-dna-id': dnaId},
        })
      }
      index = (index + 1) % dnaIds.length
    }

    return new Response(JSON.stringify({errorMessage: 'No dna found'}), {
      status: 404,
      headers: JSON_HEADERS,
    })
  } else if (query.route === 'list') {
    const dnaIds =
      ((await KV.get('dnaIdsList', 'json')) as string[] | null) ?? []
    const dnas = (
      await Promise.all(
        dnaIds.map(async id => {
          const bytes = await getFittestDnaBytesById(KV, id)
          return bytes ? decodeDna(id, bytes) : null
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null)
    return new Response(encodeDnaList(dnas), {headers: BINARY_HEADERS})
  } else if (query.route === 'image') {
    const stream = await KV.get('image:' + query.id, 'stream')
    return new Response(stream, {
      headers: {...CORS_HEADERS, 'content-type': 'image/png'},
    })
  } else if (query.route === 'save') {
    const buf = new Uint8Array(await request.arrayBuffer())
    if (buf.byteLength < DNA_HEADER_BYTES) {
      return new Response(JSON.stringify({errorMessage: 'Bad payload'}), {
        status: 400,
        headers: JSON_HEADERS,
      })
    }
    const id = query.id
    if (!id) {
      return new Response(JSON.stringify({errorMessage: 'Missing id'}), {
        status: 400,
        headers: JSON_HEADERS,
      })
    }
    const fitness = readFitnessFromDnaBytes(buf)
    const renderSize = readRenderSizeFromDnaBytes(buf)
    const key = fitnessKey(id, renderSize, fitness)
    await KV.put(key, buf as unknown as ArrayBuffer)
    await updateDnaCurrentList(KV)
    return new Response(JSON.stringify({message: 'Saved to ' + key}), {
      headers: JSON_HEADERS,
    })
  } else if (query.route === 'updateCurrentList') {
    const result = await updateDnaCurrentList(KV)
    return new Response(
      JSON.stringify({dnaCount: result.dnaIds.length}),
      {headers: JSON_HEADERS},
    )
  }

  return new Response('Hello from api!', {headers: JSON_HEADERS})
}

function formatFitnessChronological(fitness: number) {
  if (!isFinite(fitness)) fitness = 10000000000000
  fitness = Math.ceil(fitness * 100)
  fitness = Math.min(fitness, 10000000000000)
  fitness = Math.max(0, fitness)
  return fitness.toString().padStart(14, '0')
}

async function KvListAll(KV: KVNamespace, prefix: string): Promise<string[]> {
  let cursor: string | undefined = undefined
  let results: string[] = []
  while (true) {
    const response: KVNamespaceListResult<unknown, string> = await KV.list({
      prefix,
      cursor,
    })
    results = results.concat(
      response.keys.map((f: KVNamespaceListKey<unknown, string>) => f.name),
    )
    if (response.list_complete || !response.cursor) return results
    cursor = response.cursor
  }
}

async function getFittestDnaBytesById(
  KV: KVNamespace,
  id: string,
): Promise<Uint8Array | null> {
  const listResult = await KV.list({prefix: 'fitness4:' + id + ':', limit: 1})
  if (listResult.keys.length === 0) return null
  const buf = await KV.get(listResult.keys[0].name, 'arrayBuffer')
  if (!buf) return null
  return new Uint8Array(buf)
}

async function updateDnaCurrentList(KV: KVNamespace) {
  const dnaIds = (await KvListAll(KV, 'dnaIds:')).map(f => f.split(':')[1])
  await KV.put('dnaIdsList', JSON.stringify(dnaIds))
  return {dnaIds}
}
