<template>
  <div class="sidebar-panel">
    <BAccordion v-model="openSection" flush class="sidebar-accordion">
      <BAccordionItem id="pattern" :title="$t('pattern')">
        <div class="pattern-section">
          <div class="color-pickers-row">
            <span class="color-label">{{ $t('colors') }} :</span>
            <CustomColorPicker
              v-if="patternColorCount >= 1"
              v-model="patternColors[0]"
              :default-color="defaultPatternColors[0]"
              @update:modelValue="emit('override-pattern-primary', patternColors[0]); updatePatternColor(0, patternColors[0])"
            />
            <CustomColorPicker
              v-if="patternColorCount >= 2"
              v-model="patternColors[1]"
              :default-color="defaultPatternColors[1]"
              @update:modelValue="emit('override-pattern-secondary', patternColors[1]); updatePatternColor(1, patternColors[1])"
            />
            <CustomColorPicker
              v-if="patternColorCount >= 3"
              v-model="patternColors[2]"
              :default-color="defaultPatternColors[2]"
              @update:modelValue="emit('override-pattern-tertiary', patternColors[2]); updatePatternColor(2, patternColors[2])"
            />
          </div>
          <div class="patterns-row">
            <div
              v-for="(pat, i) in patterns"
              :key="pat.filename"
              @click="selectPattern(i)"
              :class="['pattern-thumb', selectedPatternIndex === i ? 'selected' : '']"
            >
              <img :src="pat.url" class="pattern-img" draggable="false" />
            </div>
          </div>
        </div>
      </BAccordionItem>
      <BAccordionItem id="emblems" :title="$t('emblems')">
        <p class="text-emblem-usage font-weight-lighter text-secondary">{{$t('emblem_usage_hint')}}</p>
        <div class="emblems-section">
          <div class="category-select-row">
            <label for="category-select">{{ $t('category') }}:</label>
            <select
              id="category-select"
              v-model="selectedCategory"
              class="form-select"
            >
              <option v-for="cat in categories" :key="cat" :value="cat">{{ $t('category_' + cat) }}</option>
            </select>
          </div>
          <div class="emblems-row">
            <div
              v-for="img in filteredImages"
              :key="img.filename"
              class="emblem-thumb"
              draggable="true"
              @dragstart="(e) => onDragStart(e, img)"
              @drop="onDrop"
            >
              <img :src="img.url" class="emblem-img" />
            </div>
          </div>
        </div>
      </BAccordionItem>
    </BAccordion>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { BAccordion, BAccordionItem } from 'bootstrap-vue-next'
import emblemsData from '../assets/emblems.json'
import patternsInfo from '../assets/patterns.json'
import CustomColorPicker from './CustomColorPicker.vue'
import { namedColors } from '@/utils/colors'

const props = defineProps({
  canvasImages: Array,
  stageSize: Object,
  showExport: Boolean,
  patternColors: Array,
  selectedPatternFileName: String
})

const patternColors = ref(
  Array.isArray(props.patternColors) && props.patternColors.length >= 3
    ? [...props.patternColors]
    : [namedColors.blue_light, namedColors.yellow_light, namedColors.green_light]
)
const defaultPatternColors = patternColors.value

const patterns = ref([])
const selectedPatternIndex = ref(0)
const selectedPatternEl = ref(null)
const images = ref([])
const emblems = ref({})
const categories = ref([])
const selectedCategory = ref('')
const filteredImages = ref([])
const openSection = ref('pattern')

const patternColorCount = computed(() => {
  const filename = patterns.value[selectedPatternIndex.value]?.filename
  return getPatternColorCount(filename)
})

const patternColorsCache = ref({}) // { patternFilename: [col1, col2, col3] }

function getPatternColorCount(filename) {
  if (!filename) return 1
  const info = patternsInfo[filename]
  return info?.colors ? Math.max(1, Math.min(3, info.colors)) : 1
}

function selectPattern(i) {
  selectedPatternIndex.value = i
  const pat = patterns.value[i]
  if (pat && !pat.imgEl) {
    const imgEl = new window.Image()
    imgEl.src = pat.url
    pat.imgEl = imgEl
  }
  selectedPatternEl.value = pat?.imgEl || null
  emitSetPattern(selectedPatternEl.value, pat?.filename)
}

function updatePatternColor(idx, color) {
  patternColors.value[idx] = color
  const filename = patterns.value[selectedPatternIndex.value]?.filename
  if (filename) {
    const arr = patternColorsCache.value[filename] || []
    arr[idx] = color
    patternColorsCache.value[filename] = arr.slice(0, getPatternColorCount(filename))
  }
}

function emitSetPattern(el, filename) {
  emit('set-pattern', el, filename)
}

function updateFilteredImages() {
  filteredImages.value = images.value.filter(
    (img) => emblems.value[img.filename]?.category === selectedCategory.value,
  )
}

function onDragStart(e, img) {
  e.dataTransfer.setData('text/plain', img.url)
  if (!img.imgEl) {
    const imgEl = new window.Image()
    imgEl.src = img.url
    img.imgEl = imgEl
  }
}

function onDrop(e) {
  const src = e.dataTransfer.getData('text/plain')
  const rect = e.currentTarget.getBoundingClientRect()
  const width = 100
  const height = 100
  const x = e.clientX - rect.left - width / 2
  const y = e.clientY - rect.top - height / 2
  const imgObj = images.value.find((img) => img.url === src)
  if (!imgObj) return
  if (!imgObj.imgEl) {
    const imgEl = new window.Image()
    imgEl.src = imgObj.url
    imgObj.imgEl = imgEl
  }
  const newImage = {
    id: Date.now() + Math.random(),
    x,
    y,
    el: imgObj.imgEl,
    width,
    height,
    rotation: 0,
    filename: imgObj.filename,
    centerX: 0,
    centerY: 0,
  }
  emit('add-image', newImage)
}

const emit = defineEmits([
  'add-image',
  'remove-image',
  'handle-layer-click',
  'copy-export',
  'show-export',
  'set-pattern',
  'override-pattern-primary',
  'override-pattern-secondary',
  'override-pattern-tertiary'
])

onMounted(() => {
  const emblemsBaseUrl = import.meta.env.BASE_URL + 'coat_of_arms/colored_emblems/'
  const arr = Object.keys(emblemsData).map((filename) => {
    return {
      filename,
      url: emblemsBaseUrl + filename
    }
  })
  images.value = arr
  window.sidebarImages = arr // <-- expose les images globalement

  emblems.value = emblemsData
  const cats = new Set(Object.values(emblems.value).map((e) => e.category))
  categories.value = Array.from(cats)
  selectedCategory.value = categories.value[0] || '<None>'
  updateFilteredImages()

  const patternsBaseUrl = import.meta.env.BASE_URL + 'coat_of_arms/patterns/'
  const patternArr = Object.keys(patternsInfo).map((filename) => {
    return {
      filename,
      url: patternsBaseUrl + filename,
    }
  })
  patterns.value = patternArr

  let defaultIdx = patterns.value.findIndex(p => p.filename === 'pattern_checkers_02.png')

  if (defaultIdx === -1) defaultIdx = 0
  if (patterns.value.length > 0) {
    selectedPatternIndex.value = defaultIdx
    const defaultPattern = patterns.value[defaultIdx]
    if (!defaultPattern.imgEl) {
      const imgEl = new window.Image()
      imgEl.src = defaultPattern.url
      defaultPattern.imgEl = imgEl
    }
    selectedPatternEl.value = defaultPattern.imgEl
    emitSetPattern(selectedPatternEl.value, defaultPattern.filename)
    selectPattern(defaultIdx)
  }
})

watch(
  () => props.patternColors,
  (arr) => {
    if (Array.isArray(arr) && arr.length) {
      patternColors.value = [...arr]
    }
  },
  { deep: true }
)

watch(
  () => props.selectedPatternFileName,
  (filename) => {
    if (!filename || !patterns.value?.length) return
    const idx = patterns.value.findIndex(p => p.filename === filename)
    if (idx >= 0 && selectedPatternIndex.value !== idx) {
      selectedPatternIndex.value = idx
      const pat = patterns.value[idx]
      if (pat && !pat.imgEl) {
        const imgEl = new window.Image()
        imgEl.src = pat.url
        pat.imgEl = imgEl
      }
      selectedPatternEl.value = pat?.imgEl || null
      emitSetPattern(selectedPatternEl.value, pat?.filename)
    }
  },
  { immediate: true }
)

watch(selectedCategory, updateFilteredImages)
watch(selectedPatternIndex, (i) => {
  selectedPatternEl.value = patterns.value[i]?.imgEl || null
  emitSetPattern(selectedPatternEl.value, patterns.value[i].filename)
})
</script>

<style scoped>
.sidebar-panel {
  overflow-x: hidden;
}
.sidebar-accordion {
  margin-left: 12px;
}
.pattern-section {
  padding: 12px;
}
.color-pickers-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}
.color-label {
  font-weight: 500;
  margin-right: 8px;
}

.text-emblem-usage {
  margin-bottom: 0;
  font-style: italic;
  font-size: 14px;
  padding-left: 12px;
}

/* Supprime la bordure bleue sur l'item sélectionné de l'accordion */
:deep(.accordion-button:focus),
:deep(.accordion-button:not(.collapsed)) {
  box-shadow: none !important;
  border-color: #eaeaea !important;
  outline: none !important;
}

:deep(.accordion-button:not(.collapsed)) {
  background-color: #eaeaea;
}

.patterns-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: flex-start;
}
.pattern-thumb {
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  border: 1px solid #aaa;
  background: #f9f9f9;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.pattern-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.emblems-section {
  padding: 12px;
}
.category-select-row {
  margin-bottom: 16px;
  display: block;
}
.emblems-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  max-height: 80vh;
  overflow-y: auto;
}
.emblem-thumb {
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  border: 1px solid #d7d7d7;
  background: #fbfbfb;
  cursor: pointer;
  box-sizing: border-box;
}
.emblem-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
