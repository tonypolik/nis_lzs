<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <div class="row">
      <div class="col-md-6">
        <decompress></decompress>
      </div>
      <div class="col-md-6">
        <compress></compress>
      </div>
    </div>
  </div>
</template>

<script>
import NisLzs from 'nis_lzs'
import { Buffer } from 'buffer'
import toBuffer from 'blob-to-buffer'
import { saveAs } from 'file-saver'
import Compress from './Compress'
import Decompress from './Decompress'

export default {
  name: 'hello',
  components: { Decompress, Compress },
  data () {
    return {
      msg: 'NIS LZS'
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
