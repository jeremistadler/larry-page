import {KVNamespace} from '@cloudflare/workers-types'
import {generateChronologicalId} from './generateChronologicalId'
import {Utils} from 'shared/src/utils'
import {getAssetFromKV, mapRequestToAsset} from '@cloudflare/kv-asset-handler'

declare global {
  const KV: KVNamespace
}

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event: FetchEvent) => {
  const params: Record<string, string> = {}
  const url = new URL(event.request.url)
  console.log(url)

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
    await KV.put('generations:' + id + ':' + dna.Generation, json)
    await KV.put('currentGeneration:' + id, json)
    await KV.put('dnaIds:' + id, id)
    await updateDnaCurrentList()

    return new Response(JSON.stringify({dna}), {
      headers: {'content-type': 'application/json'},
    })
  } else if (query.route === 'random') {
    const list = (await KV.get('currentGenerationList', 'json')) as any[]
    const index = Utils.randomIndex(list)
    return new Response(JSON.stringify(list[index]), {
      headers: {'content-type': 'application/json'},
    })
  } else if (query.route === 'list') {
    const list = await KV.get('currentGenerationList', 'text')
    return new Response(list, {
      headers: {'content-type': 'application/json'},
    })
  } else if (query.route === 'image') {
    const stream = await KV.get('image:' + query.id, 'stream')
    return new Response(stream, {
      headers: {'content-type': 'image/png'},
    })
  }

  return new Response('Hello from api!', {
    headers: {'content-type': 'text/plain'},
  })
}

async function updateDnaCurrentList() {
  const items = await KV.list({prefix: 'dnaIds:'})
  const keys = items.keys.map(f => f.name.split(':')[1])
  const all = await Promise.all(
    keys.map(f => KV.get('currentGeneration:' + f, 'json')),
  )
  await KV.put('currentGenerationList', JSON.stringify(all))
}

async function handleStaticRequest(event: FetchEvent) {
  try {
    const customKeyModifier = (request: Request) => {
      let url = request.url
      //custom key mapping optional
      url = url.replace('/larry', '').replace(/^\/+/, '')
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
