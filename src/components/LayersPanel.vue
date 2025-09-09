<template>
  <div>
    <h3>{{ $t('layers') }}</h3>
    <div style="max-height: 80vh">
      <div
        v-for="({ img, idx }, i) in sortedLayers"
        :key="img.id"
        class="layerContainer"
        :style="{
          border: selectedIndex === idx ? '2px solid #0078d4' : '1px solid #ccc',
          background: selectedIndex === idx ? '#e6f0fa' : '#fff',
        }"
      >
        <div
          class="layerHeader"
          :class="{ warn: isStretchedAndRotated[img.id] }"
          @click="$emit('select', idx)"
        >
          <!-- Drag handle -->
          <span
            draggable="true"
            @dragstart="onNativeDragStart($event, idx)"
            @dragover.prevent
            @drop="$emit('drop', idx)"
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
import { NInputNumber, NCheckbox, NButton, NButtonGroup } from 'naive-ui'
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

// Tri d'affichage: plus petite depth en premier (au-dessus)
const sortedLayers = computed(() =>
  (props.canvasImages || [])
    .map((img, idx) => ({ img, idx }))
    .sort((a, b) => {
      const da = Number(a.img.depth ?? 0)
      const db = Number(b.img.depth ?? 0)
      if (da !== db) return da - db // plus petit d'abord (au-dessus)
      return b.idx - a.idx
    })
)

watch(
  () => props.canvasImages,
  (layers) => {
    layers.forEach(layer => {
      const count = getLayerColorCount(layer.filename)
      // Si les couleurs existent sur le layer, on les utilise
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
        // Met à jour les couleurs si elles changent (ex: copie/coller)
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
      // Init rotation si absent
      if (layerRotation.value[layer.id] === undefined) {
        layerRotation.value[layer.id] = layer.rotation ?? 0
      } else if (layer.rotation !== undefined && layerRotation.value[layer.id] !== layer.rotation) {
        layerRotation.value[layer.id] = layer.rotation
      }
      // Init position si absent
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
      // Init stretch si absent
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
      // Init mask si absent
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

const dragPreviewEl = ref(null)

function onNativeDragStart(e, idx) {
  // Preserve legacy event with same parameter
  emit('dragstart', idx)

  try {
    const container = e.currentTarget?.closest('.layerContainer')
    if (!container || !e.dataTransfer) return
    const rect = container.getBoundingClientRect()

    // Create a clone and style it
    const clone = container.cloneNode(true)
    clone.style.opacity = '0.6'
    clone.style.pointerEvents = 'none'
    clone.style.position = 'fixed'
    clone.style.top = '-1000px'
    clone.style.left = '-1000px'
    clone.style.zIndex = '9999'
    clone.style.width = rect.width + 'px'
    clone.style.height = rect.height + 'px'
    document.body.appendChild(clone)
    dragPreviewEl.value = clone

    // Compute cursor offset within the original element
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

    e.dataTransfer.effectAllowed = 'move'
    // Set the clone as the drag image so it follows the cursor
    e.dataTransfer.setDragImage(clone, offsetX, offsetY)
  } catch {
    // no-op if setDragImage not supported
  }
}

function onNativeDragEnd() {
  if (dragPreviewEl.value && dragPreviewEl.value.parentNode) {
    dragPreviewEl.value.parentNode.removeChild(dragPreviewEl.value)
  }
  dragPreviewEl.value = null
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
.layerContainer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 6px;
  cursor: 'pointer';
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

/* Assure l’affichage en ligne des colonnes même en style scoped */
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

/* Labels alignés à droite, sans forcer un retour à la ligne */
.layer-grid .row label {
  display: block;
  width: 100%;
  text-align: right;
  padding-right: 6px;
  margin-bottom: 0;
  line-height: 1.2;
}

/* Empêche l’InputNumber de forcer le wrap */
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
