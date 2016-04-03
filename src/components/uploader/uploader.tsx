import * as React from 'react';
import {Dna} from '../../scripts/dna';
import {RenderConfig} from '../../scripts/shared';
declare var fetch: any;

interface UploaderProps { };
interface UploaderState { };

class Uploader extends React.Component<UploaderProps, UploaderState> {

  uploadFile(e) {
      var fd = new FormData();
      fd.append('file', (this.refs as any).file.getDOMNode().files[0]);

      fetch(RenderConfig.baseUrl + '/api/upload', {
        method: 'POST',
        body: fd
      })
  }

  render() {
    return (
        <div>
            <form ref="uploadForm" className="uploader" encType="multipart/form-data" >
               <input ref="file" type="file" name="file" className="upload-file"/>
               <input type="button" ref="button" value="Upload" onClick={this.uploadFile.bind(this)} />
           </form>
        </div>
    );
  }
}

export default Uploader;
