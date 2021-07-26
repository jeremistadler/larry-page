import * as React from 'react'
import './uploader.css'
import {DnaApi} from '../scripts/api'
import {Dna} from 'shared/src/dna'
import {Utils} from 'shared/src/utils'

export default function Uploader(props: {onUploaded: (dna: Dna) => void}) {
  const uploadForm = React.useRef<HTMLInputElement>(null)

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (uploadForm.current?.files ?? [])[0]
    if (!file) return
    console.log('Uploading...')
    const imageId = await DnaApi.uploadNewImage(file)
    console.log({imageId})
    props.onUploaded(Utils.createDna(20, imageId))
  }

  return (
    <div>
      <form className="uploader" encType="multipart/form-data">
        <label htmlFor="uploader">Upload Image</label>
        <input
          ref={uploadForm}
          type="file"
          name="uploader"
          id="uploader"
          className="upload-file"
          onChange={uploadFile}
        />
      </form>
    </div>
  )
}
