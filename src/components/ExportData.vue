<template>
  <div>
    <button class="btn btn-primary" style="width: auto; min-width: 60px;" @click="showModal = true">{{ $t('export') }}</button>
    <BModal
      v-model="showModal"
      :title="$t('export_ck3')"
      size="lg"
      centered
      :okOnly="false"
    >
      <div>
        <p>{{ $t('export_instructions') }}</p>

        <!-- Warning when at least one emblem is stretched AND rotated -->
        <div v-if="hasStretchedAndRotated" class="alert alert-warning" role="alert" style="margin-bottom: 12px;">
          {{ $t('export_warning_stretched_rotated') }}
        </div>

        <textarea
          ref="exportTextarea"
          readonly
          class="export-textarea"
          :value="exportText"
        />
      </div>
      <template #footer>
        <button
          class="btn btn-warning"
          style="color: #fff;"
          @click="copyToClipboard"
        >
          {{ $t('copy_to_clipboard') }}
        </button>
        <button
          class="btn btn-primary"
          @click="showModal = false"
        >
          OK
        </button>
      </template>
    </BModal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { BModal } from 'bootstrap-vue-next'
import { hexToRgb } from '../utils/colors.js'
import { notify } from "@kyvg/vue3-notification";
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
const props = defineProps({
  patternFileName: String,
  patternColors: Array,
  emblems: Array,
  canvasSize: Object,
})

const showModal = ref(false)

function normalize(val, size) {
  // Normalize coord between [0,1] according to canvas size
  return (val / size).toFixed(4)
}

const exportText = computed(() => {
  if (!props.patternFileName || !props.canvasSize) return ''
  const patternName = props.patternFileName.replace(/\.png$/i, '')
  let text = `custom_coat={\n`
  text += `  custom=yes\n`
  text += `  pattern="${patternName}.dds"\n`
  for(let i = 0; i < props.patternColors.length; i++) {
    const rgb = hexToRgb(props.patternColors[i])
    text += `  color${i+1}=rgb{${rgb[0]} ${rgb[1]} ${rgb[2]}}\n`
  }
  for (const emblem of props.emblems) {
    const emblemName = emblem.filename.replace(/\.png$/i, '.dds')

    // Take eventual flipping into consideration
    let centerX = emblem.centerX
    let centerY = emblem.centerY

    const exportX = normalize(centerY, props.canvasSize.height)
    const exportY = normalize(centerX, props.canvasSize.width)
    const scaleX = (((emblem.width ?? 100) / props.canvasSize.width) * (emblem.scaleX ?? 1)).toFixed(4)
    const scaleY = (((emblem.height ?? 100) / props.canvasSize.height) * (emblem.scaleY ?? 1)).toFixed(4)
    const rotation = (emblem.rotation ?? 0).toFixed(2)

    text += `  colored_emblem={\n`
    text += `    texture="${emblemName}"\n`

    const maskX = emblem.maskPrimary ? 0 : 1
    const maskY = emblem.maskSecondary ? 0 : 2
    const maskZ = emblem.maskTertiary ? 0 : 3
    text += `    mask={${maskX} ${maskY} ${maskZ}}\n`

    for(let i = 0; i < emblem.colors.length; i++) {
      const rgb = hexToRgb(emblem.colors[i])
      text += `    color${i+1}=rgb{${rgb[0]} ${rgb[1]} ${rgb[2]}}\n`
    }
    text += `    instance={\n`
    text += `        position={${exportY} ${exportX} }\n`
    text += `        scale={${scaleX} ${scaleY} }\n`
    text += `        rotation=${rotation}\n`
    text += `    }\n`
    text += `  }\n`
  }
  text += `}\n`
  return text
})

// True if at least one emblem is stretched (width != height) and rotated (rotation != 0)
const hasStretchedAndRotated = computed(() =>
  (props.emblems || []).some(e => {
    const w = Math.abs(Math.round(e?.width ?? 0))
    const h = Math.abs(Math.round(e?.height ?? 0))
    const rot = Math.round(Number(e?.rotation ?? 0))
    return w !== h && rot !== 0
  })
)

const exportTextarea = ref(null)

function copyToClipboard() {
  const textarea = exportTextarea.value
  if (textarea) {
    // Utilise l'API Clipboard moderne si disponible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textarea.value)
    } else {
      textarea.select()
      document.execCommand('copy')
    }

    notify({
      title: $t('copy_success_title'),
      text: $t('copy_success_text'),
      type: "success"
    })
  }
}
</script>

<style scoped>
.export-card {
  margin-top: 16px;
}
.export-textarea {
  width: 100%;
  height: 350px;
  font-family: monospace;
  font-size: 13px;
  margin-top: 16px;
  resize: none;
}
</style>
