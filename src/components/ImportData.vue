<template>
  <div style="display: inline-block; margin-left: 8px;">
    <button class="btn btn-secondary" style="width: auto; min-width: 60px;" @click="show = true">{{ $t('import') }}</button>
    <BModal
      v-model="show"
      :title="$t('import_ck3')"
      size="lg"
      centered
      :ok-only="false"
      :ok-title="$t('import')"
      :cancel-title="$t('cancel')"
      @ok="onImport"
    >
      <div>
        <p>{{ $t('import_instructions') }}</p>
        <textarea v-model="raw" class="import-textarea" />
      </div>
    </BModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BModal } from 'bootstrap-vue-next'
import { parseCoatScript } from '@/utils/PdxScript'
import { rgbToHex, namedColors } from '@/utils/colors'
import { notify } from "@kyvg/vue3-notification"
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()

const props = defineProps({
  canvasSize: { type: Object, required: true } // { width, height }
})
const emit = defineEmits(['import-data'])

const show = ref(false)
const raw = ref('')

function parseImport(text) {

  var jsonData = parseCoatScript(text);

  const result = {
    patternFileName: jsonData.pattern.replace(/\.dds$/i, '.png'),
    patternColors: [resolveColor(jsonData.color1), resolveColor(jsonData.color2), resolveColor(jsonData.color3)],
    emblems: []
  }

  if(!Array.isArray(jsonData.colored_emblem)) {
    jsonData.colored_emblem = [jsonData.colored_emblem];
  }

  var nextDepth = -1;

  jsonData.colored_emblem.forEach(emb => {

    if(!Array.isArray(emb.instance)) {
      emb.instance = [emb.instance];
    }
    emb.instance.forEach(inst => {

      const stageW = props.canvasSize.width
      const stageH = props.canvasSize.height
      const scaleX = (parseFloat(inst?.scale?.[0] ?? 1) > 0) ? 1 : -1
      const scaleY = (parseFloat(inst?.scale?.[1] ?? 1) > 0) ? 1 : -1
      const cx = parseFloat(inst?.position?.[0] ?? 0.5) * stageW
      const cy = parseFloat(inst?.position?.[1] ?? 0.5) * stageH
      const w = Math.abs(parseFloat(inst?.scale?.[0] ?? 1) * stageW)
      const h = Math.abs(parseFloat(inst?.scale?.[1] ?? 1) * stageH)
      const rotation = parseFloat(inst?.rotation ?? 0)

      var depth = 0;
      if(inst?.depth) {
        depth = parseFloat(inst.depth);
      } else { // if no depth provided, set one. Lower depth = drawn closer to the foreground
        depth = nextDepth;
        nextDepth -= 1;
      }

      var instColors = [];
      instColors.push(resolveColor(emb.color1));
      if(emb.color2) {
        instColors.push(resolveColor(emb.color2));
      }
      if(emb.color3) {
        instColors.push(resolveColor(emb.color3));
      }

     result.emblems.push({
        filename: emb.texture.replace(/\.dds$/i, '.png'),
        colors: instColors,
        x: cx,
        y: cy,
        width: w,
        height: h,
        rotation: rotation,
        maskPrimary: emb.mask?.[0] === 0,
        maskSecondary: emb.mask?.[1] === 0,
        maskTertiary: emb.mask?.[2] === 0,
        depth: depth,
        scaleX: scaleX,
        scaleY: scaleY
      })
    })
  })

  return result;
}

function resolveColor(color) {
  if(color == null || color == undefined) return null;
  if(color.type && color.type == "rgb") {
    return rgbToHex(color.value[0], color.value[1], color.value[2])
  }
  return namedColors[color] || color
}

function onImport() {
  try {
    const parsed = parseImport(raw.value || '')
    emit('import-data', parsed)
    show.value = false
  } catch (e) {
    notify({
      title: $t('import_error_title'),
      text: $t('import_error_text') + ' ' + (e?.message || e),
      type: "error",
      duration: 5000
    })
  }
}
</script>

<style scoped>
.import-textarea {
  width: 100%;
  height: 260px;
  font-family: monospace;
  font-size: 13px;
  margin-top: 8px;
  resize: vertical;
}
</style>
