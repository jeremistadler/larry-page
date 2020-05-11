import * as React from 'react'
import './uploader.css'
import {DnaApi} from '../scripts/api'
import {Dna} from 'shared/src/dna'

export default function Uploader(props: {onUploaded: (dna: Dna) => void}) {
  const uploadForm = React.useRef<HTMLInputElement>(null)

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (uploadForm.current?.files ?? [])[0]
    if (!file) return
    console.log('Uploading...')
    const dna = await DnaApi.uploadNewImage(file)
    console.log(dna)
    props.onUploaded(dna)
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
