<template>   
    <form novalidate>
        <div class="dropbox" @drop="onDrop" @dragover="onDragOver">
            <input type="file" class="input-file">
            <p>Decompress</p>
        </div>
    </form>
</template>

<script>
import NisLzs from 'nis_lzs'
import { Buffer } from 'buffer'
import toBuffer from 'blob-to-buffer'
import { saveAs } from 'file-saver'

export default {
  name: 'decompress',
  methods: {
    onDrop(event) {
      event.dataTransfer.dropEffect = 'copy';
      let file = event.dataTransfer.files[0];
      toBuffer(file, (err, buffer) => {
        let out = NisLzs.decompressBuffer(buffer);
        let blob = new Blob([out.buffer]);
        let fileName = file.name + '.' + out.extension;
        saveAs(blob, fileName);
      });
    },
    onDragOver(event) {
      event.dataTransfer.dropEffect = 'copy';
      event.preventDefault();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.dropbox {
  outline: 2px dashed grey; /* the dash box */
  outline-offset: -10px;
  background: lightcyan;
  color: dimgray;
  padding: 10px 10px;
  min-height: 200px; /* minimum height */
  position: relative;
  cursor: pointer;
}

.input-file {
  opacity: 0; /* invisible but it's there! */
  width: 100%;
  height: 200px;
  position: absolute;
  cursor: pointer;
}

.dropbox:hover {
  background: lightblue; /* when mouse over to the drop zone, change color */
}

.dropbox p {
  font-size: 1.2em;
  text-align: center;
  padding: 50px 0;
}
</style>
