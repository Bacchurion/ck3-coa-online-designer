<template>
  <div style="display: inline-block; position: relative;">
    <svg
      width="32"
      height="32"
      @click="togglePicker"
      style="cursor: pointer; display: inline-block;"
    >
      <circle
        cx="16"
        cy="16"
        r="15"
        :fill="modelValue"
        :stroke="showPicker ? '#0078d4' : 'transparent'"
        stroke-width="2"
      />
    </svg>
    <div
      v-if="showPicker"
      class="picker-popover"
    >
      <div
        class="picker-content"
      >
        <SketchPicker
          :modelValue="modelValue"
          :disableAlpha="true"
          :presetColors="presets"
          @update:modelValue="onColorChange"
          presetColorsClass="large-presets"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { SketchPicker } from 'vue-color'

const props = defineProps({
  modelValue: { type: String, default: '#68CCCA' },
  defaultColor: { type: String, default: '#68CCCA' }
})
const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const presets = [
  "#732217", "#143F66", "#BF8630", "#1F4C23", "#1A1713",
  "#CCCAC8", "#591B40", "#993B00", "#808080", "#733C1E",
  "#2A5D8C", "#336638", "#FFAD33"
]

// Met à jour la couleur si la prop change et le picker est fermé
watch(() => props.defaultColor, (val) => {
  if (!showPicker.value) emit('update:modelValue', val)
})

function togglePicker() {
  showPicker.value = !showPicker.value
}

function closePicker() {
  showPicker.value = false
}

function handleClickOutside(event) {
  const popover = document.querySelector('.picker-popover')
  if (showPicker.value && popover && !popover.contains(event.target)) {
    closePicker()
  }
}

function onColorChange(val) {
  emit('update:modelValue', val)
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.picker-popover {
  position: absolute;
  z-index: 10;
  top: 40px;
  left: -60px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 8px;
}
.picker-content {
  /* Ajouté pour capturer tous les événements drag/mouse/touch */
  width: 100%;
  height: 100%;
}
.picker-popover .preset-color {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  margin: 4px !important;
  border: 2px solid #eee !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
</style>
