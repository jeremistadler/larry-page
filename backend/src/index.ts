import { CloudflareWorkerKV } from 'types-cloudflare-worker'
import { generateChronologicalId } from './generateChronologicalId'
import { Utils } from './utils'
import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event: FetchEvent) => {
  const params: Record<string, string> = {}
  const url = new URL(event.request.url)
  console.log(url)

  const queryString = url.search.slice(1).split('&')

  queryString.forEach(item => {
    const kv = item.split('=')
    if (kv[0]) params[kv[0]] = kv[1]
  })

  event.respondWith(handleRequest(event, params))
})

declare const KV: CloudflareWorkerKV

async function handleRequest(event: FetchEvent, query: Record<string, string>) {
  const { request } = event

  try {
    return await getAssetFromKV(event)
  } catch (e) {}

  if (query.route === 'upload') {
    let buf = await event.request.arrayBuffer()
    const id = generateChronologicalId()
    await KV.put('dna:' + id + ':image', buf)
    const dna = Utils.createDna(10, '', id)

    return new Response('Hello worker!', {
      headers: { 'content-type': 'text/plain' },
    })
  }

  return new Response('Hello worker!', {
    headers: { 'content-type': 'text/plain' },
  })
}
