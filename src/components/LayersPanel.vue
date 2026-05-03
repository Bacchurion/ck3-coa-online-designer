<template>
  <div>
    <h3>{{ $t('layers') }}</h3>
    <div class="layers-container" ref="layersContainer">
      <div
        v-for="({ img, idx }, i) in sortedLayers"
        :key="img.id"
        class="layerContainer"
        :class="{
          'is-dragging': draggedIndex === i,
          'shift-down': shouldShiftDown(i),
          'shift-up': shouldShiftUp(i),
        }"
        :style="{
          border: selectedIndex === idx ? '2px solid #0078d4' : '1px solid #ccc',
          background: selectedIndex === idx ? '#e6f0fa' : '#fff',
        }"
        @dragover="onDragOver($event)"
        @dragenter.prevent="onDragEnter"
        @dragleave="onDragLeave"
      >
        <div
          class="layerHeader"
          :class="{ warn: isStretchedAndRotated[img.id] }"
          @click="$emit('select', idx)"
        >
          <!-- Drag handle -->
          <span
            draggable="true"
            @dragstart="onNativeDragStart($event, idx, i)"
            @dragend="onNativeDragEnd"
            style="cursor: grab; display: flex; align-items: center; margin-right: 8px; margin-left: 8px"
            :title="$t('move_layer')"
          >
            <i class="bi bi-grip-vertical" style="font-size: 20px;"></i>
          </span>
          <img
            :src="img.el.src"
            style="width: 32px; height: 32px; object-fit: contain; margin-right: 10px"
          />
          <span style="flex: 1; display: flex; align-items: center;">
            {{ $t('layer') }} {{ idx + 1 }}
            <div
              class="d-flex align-items-center"
              style="gap: 8px; margin-left: 40px;"
              @click.stop
            >
              <CustomColorPicker
                v-for="n in getLayerColorCount(img.filename)"
                :key="n"
                v-model="layerColors[img.id][n-1]"
                :default-color="defaultLayerColor(n-1)"
                @update:modelValue="onLayerColorChange(img.id, n-1, layerColors[img.id][n-1])"
              />
            </div>
          </span>

          <!-- Flip buttons in header -->
          <div class="header-actions-left">
            <n-button
              class="headerIconBtn"
              strong
              secondary
              size="small"
              @click.stop="emit('flip-horizontal', { layerId: img.id })"
              :title="$t('flip_horizontal')"
            >
              <i class="bi bi-arrows" style="font-size: 20px;"></i>
            </n-button>
            <n-button
              class="headerIconBtn"
              strong
              secondary
              size="small"
              @click.stop="emit('flip-vertical', { layerId: img.id })"
              :title="$t('flip_vertical')"
            >
              <i class="bi bi-arrows-vertical" style="font-size: 20px;"></i>
            </n-button>
          </div>

          <div class="header-actions-right">
            <!-- Warning icon just left of the chevron -->
            <span
              v-if="isStretchedAndRotated[img.id]"
              class="warn-icon"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              :title="$t('stretched_rotated_warning')"
            >
              <i class="bi bi-exclamation-circle-fill" style="font-size: 20px;"></i>
            </span>

            <button
              @click.stop="toggleExpanded(img.id)"
              style="
                background: #eee;
                color: #333;
                border: none;
                border-radius: 4px;
                padding: 2px 6px;
                cursor: pointer;
                margin-right: 4px;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 28px;
              "
              :title="$t('advanced_controls')"
            >
              <i class="bi bi-chevron-down" v-if="!expanded[img.id]"></i>
              <i class="bi bi-chevron-up" v-if="expanded[img.id]"></i>
            </button>
            <button
              @click.stop="$emit('remove', idx)"
              style="
                background: #e74c3c;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 2px 6px;
                cursor: pointer;
                margin-right: 4px;
                height: 28px;
              "
              :title="$t('remove')"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div v-if="expanded[img.id]" class="layerContent" draggable="false" @click.prevent.stop>
          <div class="layer-grid">
            <div class="row align-items-center g-2">
              <label class="col-3">{{ $t('position_X') }} :</label>
              <n-input-number
                class="inline-input-number col-3"
                :value="Math.round(layerPos[img.id].x)"
                :min="-1000"
                :max="1000"
                :step="1"
                size="small"
                button-placement="both"
                @update:value="setX(img.id, $event)"
              />
              <label class="col-3">{{ $t('position_Y') }} :</label>
              <n-input-number
                class="inline-input-number col-3"
                :value="Math.round(layerPos[img.id].y)"
                :min="-1000"
                :max="1000"
                :step="1"
                size="small"
                button-placement="both"
                @update:value="setY(img.id, $event)"
              />
            </div>

            <div class="row align-items-center g-2">
              <label class="col-3">{{ $t('stretch_x') }}:</label>
              <n-input-number
                class="inline-input-number col-3"
                :value="Math.round(layerStretch[img.id].x)"
                :min="1"
                :max="1000"
                :step="1"
                size="small"
                button-placement="both"
                @update:value="setStretchX(img.id, $event)"
              />
              <label class="col-3">{{ $t('stretch_y') }}:</label>
              <n-input-number
                class="inline-input-number col-3"
                :value="Math.round(layerStretch[img.id].y)"
                :min="1"
                :max="1000"
                :step="1"
                size="small"
                button-placement="both"
                @update:value="setStretchY(img.id, $event)"
              />
            </div>

            <div class="row align-items-center g-2">
              <label class="col-3">{{ $t('rotation') }}:</label>
              <n-input-number
                class="inline-input-number col-3"
                :value="Math.round(layerRotation[img.id] ?? 0)"
                :min="-180"
                :max="180"
                :step="1"
                size="small"
                :show-button="false"
                @update:value="onRotationChange(img.id, $event)"
              >
                <template #suffix>°</template>
              </n-input-number>
              <div class="col-6"></div>
            </div>

            <div class="row align-items-center g-2">
              <label class="col-3">{{ $t('mask') }} :</label>
              <div class="col-9 mask-checkboxes d-flex flex-wrap align-items-center gap-2">
                <n-checkbox
                  :checked="layerMask[img.id]?.primary ?? false"
                  @update:checked="setMask(img.id, 'primary', $event)"
                >{{ $t('primary') }}</n-checkbox>
                <n-checkbox
                  :checked="layerMask[img.id]?.secondary ?? false"
                  @update:checked="setMask(img.id, 'secondary', $event)"
                >{{ $t('secondary') }}</n-checkbox>
                <n-checkbox
                  :checked="layerMask[img.id]?.tertiary ?? false"
                  @update:checked="setMask(img.id, 'tertiary', $event)"
                >{{ $t('tertiary') }}</n-checkbox>
              </div>
            </div>

            <div class="row align-items-center g-2" v-if="isStretchedAndRotated[img.id]">
              <div class="col-3"></div>
              <div class="col-9">
                <n-button size="small" type="warning" @click.stop="resetStretch(img.id)">
                  {{ $t('reset_stretch') }}
                </n-button>
                <n-button size="small" type="warning" class="ms-2" @click.stop="resetRotation(img.id)">
                  {{ $t('reset_rotation') }}
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUpdated, onBeforeUnmount, nextTick } from 'vue'
import { NInputNumber, NCheckbox, NButton } from 'naive-ui'
import emblemsData from '../assets/emblems.json'
import CustomColorPicker from './CustomColorPicker.vue'
import { Tooltip } from 'bootstrap'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  canvasImages: Array,
  selectedIndex: Number,
})
const emit = defineEmits([
  'select',
  'remove',
  'dragstart',
  'drop',
  'update-emblem-color',
  'set-emblem-pos',
  'set-emblem-stretch',
  'update-emblem-rotation',
  'set-emblem-mask',
  'flip-horizontal',
  'flip-vertical'
])

const { locale, t } = useI18n()

const layerColors = ref({})
const expanded = ref({})
const layerRotation = ref({})
const layerPos = ref({})
const layerStretch = ref({})
const layerMask = ref({})
const isStretchedAndRotated = ref({})
const layersContainer = ref(null)
const draggedIndex = ref(null)
const dropTargetIndex = ref(null)
const dragPreviewEl = ref(null)
const dragPreviewContainer = ref(null)
let containerRect = null
let layerRects = []

function getLayerColorCount(filename) {
  const info = emblemsData[filename]
  return info?.colors ? Math.max(1, Math.min(3, info.colors)) : 1
}

function defaultLayerColor(idx) {
  return ['#00008c', '#00ff80', '#ff008c'][idx] || '#ffffff'
}

function onLayerColorChange(layerId, idx, color) {
  if (!layerColors.value[layerId]) return
  layerColors.value[layerId][idx] = color
  emit('update-emblem-color', { layerId, colors: [...layerColors.value[layerId]] })
}

function toggleExpanded(layerId) {
  expanded.value[layerId] = !expanded.value[layerId]
}

function setX(layerId, value) {
  layerPos.value[layerId].x = value
  emit('set-emblem-pos', { layerId, x: value })
}
function setY(layerId, value) {
  layerPos.value[layerId].y = value
  emit('set-emblem-pos', { layerId, y: value })
}
function setStretchX(layerId, value) {
  layerStretch.value[layerId].x = value
  emit('set-emblem-stretch', { layerId, stretchX: value })
}
function setStretchY(layerId, value) {
  layerStretch.value[layerId].y = value
  emit('set-emblem-stretch', { layerId, stretchY: value })
}

function recomputeWarnForLayerById(layerId) {
  const layer = (props.canvasImages || []).find(l => l.id === layerId)
  if (!layer) return
  const sx = Math.abs(Math.round(layer.width))
  const sy = Math.abs(Math.round(layer.height))
  const rot = (layerRotation.value[layerId] ?? layer.rotation ?? 0) || 0
  isStretchedAndRotated.value[layerId] = sx !== sy && rot !== 0
}

function onRotationChange(layerId, value) {
  const rounded = Math.round(value)
  layerRotation.value[layerId] = rounded
  emit('update-emblem-rotation', { layerId, rotation: rounded })
  // update warn state immediately
  recomputeWarnForLayerById(layerId)
}

function setMask(layerId, key, value) {
  if (!layerMask.value[layerId]) {
    layerMask.value[layerId] = { primary: false, secondary: false, tertiary: false }
  }
  layerMask.value[layerId][key] = value
  emit('set-emblem-mask', { layerId, maskPrimary: layerMask.value[layerId].primary, maskSecondary: layerMask.value[layerId].secondary, maskTertiary: layerMask.value[layerId].tertiary })
}

function resetStretch(layerId) {
  const layer = (props.canvasImages || []).find(l => l.id === layerId)
  if (!layer) return
  const w = Number(layer.width ?? 0)
  const h = Number(layer.height ?? 0)
  const minVal = Math.min(w || 0, h || 0)
  if (!Number.isFinite(minVal) || minVal <= 0) return
  // local mirror
  if (!layerStretch.value[layerId]) layerStretch.value[layerId] = { x: minVal, y: minVal }
  else {
    layerStretch.value[layerId].x = minVal
    layerStretch.value[layerId].y = minVal
  }
  // notify parent once with both values
  emit('set-emblem-stretch', { layerId, stretchX: minVal, stretchY: minVal })
  // refresh warn flag
  recomputeWarnForLayerById(layerId)
}

function resetRotation(layerId) {
  layerRotation.value[layerId] = 0
  emit('update-emblem-rotation', { layerId, rotation: 0 })
  recomputeWarnForLayerById(layerId)
}

// Sort layers: smaller depth first (on top)
const sortedLayers = computed(() =>
  (props.canvasImages || [])
    .map((img, idx) => ({ img, idx }))
    .sort((a, b) => {
      const da = Number(a.img.depth ?? 0)
      const db = Number(b.img.depth ?? 0)
      if (da !== db) return da - db // smaller first (on top)
      return b.idx - a.idx
    })
)

watch(
  () => props.canvasImages,
  (layers) => {
    layers.forEach(layer => {
      const count = getLayerColorCount(layer.filename)
      // If colors exist on the layer, use them
      if (!layerColors.value[layer.id]) {
        layerColors.value[layer.id] = []
        for (let i = 0; i < count; i++) {
          layerColors.value[layer.id][i] = layer.colors?.[i] ?? defaultLayerColor(i)
        }
      } else if (layerColors.value[layer.id].length !== count) {
        layerColors.value[layer.id].length = count
        for (let i = 0; i < count; i++) {
          if (layerColors.value[layer.id][i] === undefined) {
            layerColors.value[layer.id][i] = layer.colors?.[i] ?? defaultLayerColor(i)
          }
        }
      } else {
        // Update colors if they change (e.g. copy/paste)
        for (let i = 0; i < count; i++) {
          if (
            layer.colors &&
            layer.colors[i] &&
            layerColors.value[layer.id][i] !== layer.colors[i]
          ) {
            layerColors.value[layer.id][i] = layer.colors[i]
          }
        }
      }
      // Init rotation if missing
      if (layerRotation.value[layer.id] === undefined) {
        layerRotation.value[layer.id] = layer.rotation ?? 0
      } else if (layer.rotation !== undefined && layerRotation.value[layer.id] !== layer.rotation) {
        layerRotation.value[layer.id] = layer.rotation
      }
      // Init position if missing
      if (!layerPos.value[layer.id]) {
        layerPos.value[layer.id] = { x: layer.x ?? 0, y: layer.y ?? 0 }
      } else {
        if (layer.x !== undefined && layerPos.value[layer.id].x !== layer.x) {
          layerPos.value[layer.id].x = layer.x
        }
        if (layer.y !== undefined && layerPos.value[layer.id].y !== layer.y) {
          layerPos.value[layer.id].y = layer.y
        }
      }
      // Init stretch if missing
      if (!layerStretch.value[layer.id]) {
        layerStretch.value[layer.id] = {
          x: layer.width ?? 100,
          y: layer.height ?? 100
        }
      } else {
        if (layer.width !== undefined && layerStretch.value[layer.id].x !== layer.width) {
          layerStretch.value[layer.id].x = layer.width
        }
        if (layer.height !== undefined && layerStretch.value[layer.id].y !== layer.height) {
          layerStretch.value[layer.id].y = layer.height
        }
      }
      // Init mask if missing
      if (!layerMask.value[layer.id]) {
        layerMask.value[layer.id] = {
          primary: layer.maskPrimary ?? false,
          secondary: layer.maskSecondary ?? false,
          tertiary: layer.maskTertiary ?? false
        }
      } else {
        if (layer.maskPrimary !== undefined) layerMask.value[layer.id].primary = layer.maskPrimary
        if (layer.maskSecondary !== undefined) layerMask.value[layer.id].secondary = layer.maskSecondary
        if (layer.maskTertiary !== undefined) layerMask.value[layer.id].tertiary = layer.maskTertiary
      }
      // After rotation/scale updates, recompute warn
      recomputeWarnForLayerById(layer.id)
    })
  },
  { immediate: true, deep: true }
)

function shouldShiftDown(i) {
  if (draggedIndex.value === null || dropTargetIndex.value === null) return false
  if (draggedIndex.value > dropTargetIndex.value) {
    return i >= dropTargetIndex.value && i < draggedIndex.value
  }
  return false
}

function shouldShiftUp(i) {
  if (draggedIndex.value === null || dropTargetIndex.value === null) return false
  if (draggedIndex.value < dropTargetIndex.value) {
    return i > draggedIndex.value && i <= dropTargetIndex.value
  }
  return false
}

function onNativeDragStart(e, idx, sortedIdx) {
  draggedIndex.value = sortedIdx
  dropTargetIndex.value = sortedIdx
  emit('dragstart', idx)

  if (!layersContainer.value || !e.dataTransfer) return

  // Store container and layer positions
  containerRect = layersContainer.value.getBoundingClientRect()
  layerRects = Array.from(layersContainer.value.querySelectorAll('.layerContainer')).map(el => {
    const rect = el.getBoundingClientRect()
    return {
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      height: rect.height,
      center: rect.top + rect.height / 2 - containerRect.top
    }
  })

  try {
    const container = e.currentTarget?.closest('.layerContainer')
    if (!container) return
    const rect = container.getBoundingClientRect()

    // Create a visual preview that stays horizontally fixed
    const clone = container.cloneNode(true)
    clone.style.opacity = '0.8'
    clone.style.pointerEvents = 'none'
    clone.style.position = 'fixed'
    clone.style.width = rect.width + 'px'
    clone.style.height = rect.height + 'px'
    clone.style.zIndex = '10000'
    clone.style.backgroundColor = '#fff'
    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
    clone.style.borderRadius = '4px'

    // Position it at the container's horizontal position
    clone.style.left = rect.left + 'px'
    clone.style.top = '-10000px' // Off-screen initially

    // Create a wrapper to hold the preview
    const wrapper = document.createElement('div')
    wrapper.style.position = 'fixed'
    wrapper.style.pointerEvents = 'none'
    wrapper.style.zIndex = '10000'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    dragPreviewContainer.value = wrapper
    dragPreviewEl.value = clone

    e.dataTransfer.effectAllowed = 'move'
    // Use invisible drag image
    const emptyImg = document.createElement('img')
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(emptyImg, 0, 0)
  } catch (err) {
    console.error('Drag start error:', err)
  }
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'

  if (draggedIndex.value === null) return

  if (dragPreviewEl.value && containerRect) {
    const mouseY = e.clientY
    dragPreviewEl.value.style.top = mouseY - 20 + 'px' // 20px offset for better visual
  }

  // Calculate drop target based on mouse position
  if (!layerRects.length || !containerRect) return

  const mouseY = e.clientY - containerRect.top

  let targetIndex = draggedIndex.value

  let minDistance = Infinity

  for (let j = 0; j < layerRects.length; j++) {
    const rect = layerRects[j]

    // Calculer la distance à partir du milieu de chaque élément
    const elementCenter = rect.top + rect.height / 2
    const distance = Math.abs(mouseY - elementCenter)

    if (distance < minDistance) {
      minDistance = distance
      targetIndex = j
    }
  }

  dropTargetIndex.value = targetIndex
}

function onDragEnter() {
  // Prevent default to allow drop
}

function onDragLeave() {
  // Keep drop target highlighted
}

function onNativeDragEnd() {
  // Perform the actual drop
  if (draggedIndex.value !== null && dropTargetIndex.value !== null && draggedIndex.value !== dropTargetIndex.value) {
    // Get the actual layer index (not sorted index)
    const targetLayer = sortedLayers.value[dropTargetIndex.value]

    if (targetLayer) {
      emit('drop', targetLayer.idx)
    }
  }

  // Cleanup
  if (dragPreviewContainer.value && dragPreviewContainer.value.parentNode) {
    dragPreviewContainer.value.parentNode.removeChild(dragPreviewContainer.value)
  }
  dragPreviewContainer.value = null
  dragPreviewEl.value = null
  draggedIndex.value = null
  dropTargetIndex.value = null
  containerRect = null
  layerRects = []
}

// Bootstrap tooltips lifecycle
let tooltipInstances = []
function enableWarnTooltips() {
  tooltipInstances.forEach(t => t.dispose())
  tooltipInstances = []
  const els = document.querySelectorAll('.warn-icon[data-bs-toggle="tooltip"]')
  els.forEach(el => {
    const ttp = new Tooltip(el, { container: 'body', trigger: 'hover focus' })
    tooltipInstances.push(ttp)
  })
}

// Update tooltip DOM title for current language (Bootstrap reads data-bs-original-title)
function updateWarnTooltipsText() {
  const els = document.querySelectorAll('.warn-icon[data-bs-toggle="tooltip"]')
  const newTitle = t('stretched_rotated_warning')
  els.forEach(el => {
    el.setAttribute('title', newTitle)
    el.setAttribute('data-bs-original-title', newTitle)
  })
}

onMounted(() => nextTick(() => { updateWarnTooltipsText(); enableWarnTooltips() }))
onUpdated(() => nextTick(() => { updateWarnTooltipsText(); enableWarnTooltips() }))
onBeforeUnmount(() => {
  tooltipInstances.forEach(t => t.dispose())
  tooltipInstances = []
})

// Refresh tooltips when language changes
watch(locale, async () => {
  await nextTick()
  updateWarnTooltipsText()
  enableWarnTooltips()
})
</script>

<style scoped>
.layers-container {
  max-height: 80vh;
  position: relative;
  padding-right: 8px;
}

.layerContainer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 6px;
  cursor: 'pointer';
  transition: transform 0.2s ease, opacity 0.2s ease;
  position: relative;
}

.layerContainer.is-dragging {
  opacity: 0.3;
}

.layerContainer.shift-down {
  transform: translateY(calc(100% + 6px));
}

.layerContainer.shift-up {
  transform: translateY(calc(-100% - 6px));
}

.layerHeader {
  padding-top: 6px;
  padding-bottom: 6px;
  display: flex;
  align-items: center;
  background-color: rgb(226, 228, 235);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  /* Allow wrapping and spacing inside header */
  flex-wrap: wrap;
  gap: 6px 8px;
}

/* Action containers */
.header-actions-left,
.header-actions-right {
  display: inline-flex;
  align-items: center;
}

/* Push right actions to the far right on wide screens */
.header-actions-right {
  margin-left: auto;
  gap: 8px;
}

/* On small screens, put actions on a new line:
   - left actions full width, aligned left
   - right actions full width, aligned right */
@media (max-width: 768px) {
  .header-actions-left,
  .header-actions-right {
    flex-basis: 100%;
  }
  .header-actions-left {
    justify-content: flex-start;
    order: 2;
  }
  .header-actions-right {
    justify-content: flex-end;
    order: 3;
  }
}

/* Header turns yellow on warning */
.layerHeader.warn {
  background-color: #fff3cd;
}

.warn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #b8860b;
  font-weight: 700;
  margin-right: 6px;
  font-size: 16px;
  cursor: help;
}

.layerContent {
  margin-top: 4px;
  font-size: 13px;
  padding-left: 10px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.layer-grid {
  padding-right: 10px;
}

/* Ensure columns are displayed inline even in scoped style */
.layer-grid .row {
  display: flex;
  flex-wrap: wrap;
  margin-left: -8px;
  margin-right: -8px;
}
.layer-grid .row > [class^="col-"],
.layer-grid .row > [class*=" col-"] {
  padding-left: 8px;
  padding-right: 8px;
}
.layer-grid .row > .col-3 { flex: 0 0 auto; width: 25%; }
.layer-grid .row > .col-6 { flex: 0 0 auto; width: 50%; }
.layer-grid .row > .col-9 { flex: 0 0 auto; width: 75%; }

/* Labels aligned right, without forcing a line break */
.layer-grid .row label {
  display: block;
  width: 100%;
  text-align: right;
  padding-right: 6px;
  margin-bottom: 0;
  line-height: 1.2;
}

/* Prevent InputNumber from forcing wrap */
.inline-input-number {
  width: 100%;
  min-width: 0;
}
.flipButtonGroup {
  margin-right: 30px;
}

.headerIconBtn {
  width: 28px;
  height: 28px;
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  border-radius: 4px;
}

/* Apply extra right margin to the second flip button only */
.headerIconBtn + .headerIconBtn {
  margin-right: 16px;
}
</style>
