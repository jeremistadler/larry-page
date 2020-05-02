import * as React from 'react'
import {RenderConfig} from './../scripts/shared'
import './uploader.css'

export default function Uploader() {
  const uploadForm = React.useRef<HTMLInputElement>(null)

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    var fd = new FormData()
    const file = (uploadForm.current?.files ?? [])[0]
    if (!file) return

    fd.append('file', file)

    fetch(RenderConfig.baseUrl + '/api/upload', {
      method: 'POST',
      body: fd,
    })
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
