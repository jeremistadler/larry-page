import { CloudflareWorkerKV } from 'types-cloudflare-worker'
import { generateChronologicalId } from './generateChronologicalId'
import { Utils } from './utils'
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event: FetchEvent) => {
  const params: Record<string, string> = {}
  const url = new URL(event.request.url)
  console.log(url)

  if (url.pathname.includes('/api/')) {
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

declare const KV: CloudflareWorkerKV

async function handleApiRequest(
  event: FetchEvent,
  query: Record<string, string>,
) {
  const { request } = event

  if (query.route === 'upload') {
    let buf = await event.request.arrayBuffer()
    const id = generateChronologicalId()
    await KV.put('dna:' + id + ':image', buf)
    const dna = Utils.createDna(10, '', id)

    return new Response('Hello worker!', {
      headers: { 'content-type': 'text/plain' },
    })
  }

  return new Response('Hello from api!', {
    headers: { 'content-type': 'text/plain' },
  })
}

async function handleStaticRequest(event: FetchEvent) {
  try {
    const customKeyModifier = (request: Request) => {
      let url = request.url
      //custom key mapping optional
      url = url.replace('/larry', '').replace(/^\/+/, '')
      return mapRequestToAsset(new Request(url, request))
    }

    return await getAssetFromKV(event, { mapRequestToAsset: customKeyModifier })
  } catch (e) {
    console.error(e)
    return new Response(e.toString(), {
      headers: { 'content-type': 'text/plain' },
    })
  }
}
