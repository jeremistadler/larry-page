import {KVNamespace} from '@cloudflare/workers-types'
import {generateChronologicalId} from './generateChronologicalId'
import {Utils} from 'shared/src/utils'
import {getAssetFromKV, mapRequestToAsset} from '@cloudflare/kv-asset-handler'
import {Dna} from 'shared/src/dna'

declare global {
  const KV: KVNamespace
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': 'http://localhost:1234',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const DEFAULT_HEADERS = {
  ...CORS_HEADERS,
  'content-type': 'application/json',
}

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event: FetchEvent) => {
  const params: Record<string, string> = {}
  const url = new URL(event.request.url)
  console.log(url)

  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  if (url.protocol === 'http:') {
    return event.respondWith(
      Response.redirect(event.request.url.replace('http:', 'https:'), 301),
    )
  }

  if (url.pathname.includes('/api')) {
    const queryString = url.search.slice(1).split('&')

    queryString.forEach(item => {
      const kv = item.split('=')
      if (kv[0]) params[kv[0]] = kv[1]
    })

    event.respondWith(handleApiRequest(event, params))
  } else {
    event.respondWith(handleStaticRequest(event))
  }
})

async function handleApiRequest(
  event: FetchEvent,
  query: Record<string, string>,
) {
  const {request} = event

  if (query.route === 'upload') {
    let buf = await request.arrayBuffer()
    const id = generateChronologicalId()
    await KV.put('image:' + id, buf)
    return new Response(JSON.stringify({id}), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'dna') {
    const dnaId = query.id
    const dna = await getFittestDnaAsJsonTextById(dnaId)

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

    let index = (dnaIds.indexOf(lastReturnedId) + 1) % dnaIds.length

    for (let i = 0; i < dnaIds.length; i++) {
      const dnaId = dnaIds[index]
      const dna = await getFittestDnaAsJsonTextById(dnaId)

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
    await updateDnaCurrentList()

    return new Response(JSON.stringify({message: 'Saved to ' + key}), {
      headers: DEFAULT_HEADERS,
    })
  } else if (query.route === 'updateCurrentList') {
    const result = await updateDnaCurrentList()

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
          const dna = JSON.parse(jsonText) as Dna
          return dna
        }),
    )

    return new Response(JSON.stringify({keys, dnaList, cursor: keys.cursor}), {
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

async function KvListAll(prefix: string): Promise<string[]> {
  let cursor: string | undefined = undefined
  let results: string[] = []

  while (true) {
    const response = await KV.list({prefix, cursor})
    results = results.concat(response.keys.map(f => f.name))

    if (response.list_complete || !response.cursor) return results
    cursor = response.cursor
  }
}

async function getFittestDnaAsJsonTextById(id: string): Promise<string | null> {
  const listResult = await KV.list({
    prefix: 'fitness4:' + id + ':',
    limit: 10,
  })
  if (listResult.keys.length === 0) return null
  const dnaAsText = await KV.get(listResult.keys[0].name, 'text')
  if (dnaAsText) return dnaAsText
  return null
}

async function updateDnaCurrentList() {
  const dnaIds = (await KvListAll('dnaIds:')).map(f => f.split(':')[1])

  KV.put('dnaIdsList', JSON.stringify(dnaIds))

  const fittestDnaList: string[] = (
    await Promise.all(dnaIds.map(getFittestDnaAsJsonTextById))
  ).filter(Boolean)

  await KV.put('fittestDnaList', '[' + fittestDnaList.join(',') + ']')

  return {
    dnaIds,
    fittestDnaList,
  }
}

async function handleStaticRequest(event: FetchEvent) {
  try {
    const customKeyModifier = (request: Request) => {
      let url = request.url
      //custom key mapping optional
      url = url.replace('/larry', '').replace(/^\/+/, '').replace(/\?.*$/, '')
      return mapRequestToAsset(new Request(url, request as any))
    }

    return await getAssetFromKV(event, {mapRequestToAsset: customKeyModifier})
  } catch (e) {
    console.error(e)
    return new Response(e.toString(), {
      headers: {'content-type': 'text/plain'},
    })
  }
}
