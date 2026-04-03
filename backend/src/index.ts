import {generateChronologicalId} from './generateChronologicalId'
import {Dna} from 'shared/src/dna'

export interface Env {
  KV: KVNamespace
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': 'http://localhost:1234',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const DEFAULT_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'content-type': 'application/json',
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)
    console.log(url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      })
    }

    if (url.protocol === 'http:') {
      return Response.redirect(request.url.replace('http:', 'https:'), 301)
    }

    if (url.pathname.includes('/api')) {
      const params: Record<string, string> = {}
      const queryString = url.search.slice(1).split('&')

      queryString.forEach(item => {
        const kv = item.split('=')
        if (kv[0]) params[kv[0]] = kv[1]
      })

      return handleApiRequest(request, env, ctx, params)
    }

    // Static assets are served automatically by Cloudflare Workers Assets
    return new Response('Not Found', {status: 404})
  },
} satisfies ExportedHandler<Env>

async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  query: Record<string, string>,
): Promise<Response> {
  const {KV} = env

  if (query.route === 'upload') {
    let buf = await request.arrayBuffer()
    const id = generateChronologicalId()
    await KV.put('image:' + id, buf)
    return new Response(JSON.stringify({id}), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'dna') {
    const dnaId = query.id
    const dna = await getFittestDnaAsJsonTextById(KV, dnaId)

    if (dna) {
      await KV.put('lastReturnedId', dnaId)
      return new Response(dna, {
        headers: DEFAULT_HEADERS,
      })
    }

    return new Response(JSON.stringify({errorMessage: 'No dna found'}), {
      status: 500,
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'random') {
    const dnaIds = (await KV.get('dnaIdsList', 'json')) as string[]
    const lastReturnedId = await KV.get('lastReturnedId', 'text')

    let index = (dnaIds.indexOf(lastReturnedId ?? '') + 1) % dnaIds.length

    for (let i = 0; i < dnaIds.length; i++) {
      const dnaId = dnaIds[index]
      const dna = await getFittestDnaAsJsonTextById(KV, dnaId)

      if (dna) {
        await KV.put('lastReturnedId', dnaId)
        return new Response(dna, {
          headers: DEFAULT_HEADERS,
        })
      } else {
        index = (index + 1) % dnaIds.length
      }
    }

    return new Response(JSON.stringify({errorMessage: 'No dna found'}), {
      status: 500,
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'dnaInfo') {
    const dnaIds = (await KV.get('dnaIdsList', 'json')) as string[]

    const result = await Promise.all(
      dnaIds.map(async id => {
        const listResult = await KV.list({
          prefix: 'fitness4:' + id + ':',
          limit: 100,
        })
        return {id, count: listResult.keys.length}
      }),
    )

    return new Response(JSON.stringify(result), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'list') {
    const list = await KV.get('fittestDnaList', 'text')
    return new Response(list, {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'image') {
    const stream = await KV.get('image:' + query.id, 'stream')
    return new Response(stream, {
      headers: {...DEFAULT_HEADERS, 'content-type': 'image/png'},
    })
  } else if (query.route === 'save') {
    const dna = (await request.json()) as Dna
    const json = JSON.stringify(dna)
    const id = dna.id

    const key = 'fitness4:' + id + ':' + formatFitnessChronological(dna.fitness)
    await KV.put(key, json)
    await updateDnaCurrentList(KV)

    return new Response(JSON.stringify({message: 'Saved to ' + key}), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'updateCurrentList') {
    const result = await updateDnaCurrentList(KV)

    return new Response(
      JSON.stringify({
        dnaCount: result.dnaIds.length,
        dnaWithFitnessCount: result.fittestDnaList.length,
      }),
      {
        headers: DEFAULT_HEADERS,
      },
    )
  } else if (query.route === 'updateFitness') {
    const keys = await KV.list({
      prefix: 'fitness4:',
      limit: 100,
      cursor: query.cursor,
    })

    const dnaList = await Promise.all(
      keys.keys
        .map(f => f.name)
        .map(async originalKey => {
          const jsonText = await KV.get(originalKey, 'text')
          const dna = JSON.parse(jsonText!) as Dna
          return dna
        }),
    )

    return new Response(JSON.stringify({keys, dnaList, cursor: (keys as any).cursor}), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'deleteall') {
    const fit2 = await KV.list({prefix: 'fitness2:'}).then(async items => {
      for (const item of items.keys) await KV.delete(item.name)
      return items.keys.length
    })

    const fit3 = await KV.list({prefix: 'fitness3:'}).then(async items => {
      for (const item of items.keys) await KV.delete(item.name)
      return items.keys.length
    })

    return new Response(JSON.stringify({fit2, fit3}), {
      headers: DEFAULT_HEADERS,
    })
  }

  return new Response('Hello from api!', {
    headers: DEFAULT_HEADERS,
  })
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
    const response: KVNamespaceListResult<unknown, string> = await KV.list({prefix, cursor})
    results = results.concat(response.keys.map((f: KVNamespaceListKey<unknown, string>) => f.name))

    if (response.list_complete || !response.cursor) return results
    cursor = response.cursor
  }
}

async function getFittestDnaAsJsonTextById(
  KV: KVNamespace,
  id: string,
): Promise<string | null> {
  const listResult = await KV.list({
    prefix: 'fitness4:' + id + ':',
    limit: 10,
  })
  if (listResult.keys.length === 0) return null
  const dnaAsText = await KV.get(listResult.keys[0].name, 'text')
  if (dnaAsText) return dnaAsText
  return null
}

async function updateDnaCurrentList(KV: KVNamespace) {
  const dnaIds = (await KvListAll(KV, 'dnaIds:')).map(f => f.split(':')[1])

  KV.put('dnaIdsList', JSON.stringify(dnaIds))

  const fittestDnaList: string[] = (
    await Promise.all(dnaIds.map(id => getFittestDnaAsJsonTextById(KV, id)))
  ).filter(Boolean) as string[]

  await KV.put('fittestDnaList', '[' + fittestDnaList.join(',') + ']')

  return {
    dnaIds,
    fittestDnaList,
  }
}
