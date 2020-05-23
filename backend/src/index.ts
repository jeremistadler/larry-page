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
    const dna = Utils.createDna(10, id)
    const json = JSON.stringify(dna)

    await KV.put('image:' + id, buf)
    await KV.put(
      'fitness:' + id + ':' + formatFitnessChronological(dna.fitness),
      json,
    )
    await KV.put('dnaIds:' + id, id)
    await updateDnaCurrentList()

    return new Response(JSON.stringify({dna}), {
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
    const id = dna.organism.id

    await KV.put(
      'fitness:' + id + ':' + formatFitnessChronological(dna.fitness),
      json,
    )
    await updateDnaCurrentList()

    return new Response(JSON.stringify({}), {
      headers: DEFAULT_HEADERS,
    })
  }

  // else if (query.route === 'deleteall') {
  //   const items = await KV.list({})
  //   await Promise.all(items.keys.map(f => KV.delete(f.name)))
  //   return new Response(JSON.stringify({deleted: true}), {
  //     headers: {'content-type': 'application/json'},
  //   })
  // }

  return new Response('Hello from api!', {
    headers: {'content-type': 'text/plain'},
  })
}

function formatFitnessChronological(fitness: number) {
  fitness = Math.ceil(fitness)
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
    prefix: 'fitness:' + id + ':',
    limit: 1,
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
