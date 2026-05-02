<template>
  <div class="toolbar-row">
    <ExportData
      :patternFileName="patternFileName"
      :patternColors="patternColors"
      :emblems="emblems"
      :canvas-size="canvasSize"
    />
    <ImportData
      :canvas-size="canvasSize"
      @import-data="$emit('import-data', $event)"
    />
    <!-- Reset button -->
    <button
      @click="$emit('reset-emblem')"
      class="btn btn-outline-danger"
      :title="$t('reset_emblem')"
    >
      <i class="bi bi-arrow-counterclockwise icon-left-gap"></i>
      {{ $t('reset_emblem') }}
    </button>
    <!-- Language switcher -->
    <div class="lang-switcher">
      <button
        class="btn btn-outline-info"
        @click="showLangMenu = !showLangMenu"
        title="Change language"
      >
        <span class="lang-flag">{{ getFlag(locale) }}</span>
      </button>
      <div v-if="showLangMenu" class="lang-menu">
        <button
          v-for="l in filteredLanguages"
          :key="l.code"
          class="lang-menu-item"
          @click="locale = l.code; showLangMenu = false"
          :title="l.label"
        >
          <span class="lang-flag">{{ l.flag }}</span>
          <span class="lang-label">{{ l.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ExportData from './ExportData.vue'
import ImportData from './ImportData.vue'

const props = defineProps({
  patternFileName: String,
  patternColors: Array,
  emblems: Array,
  canvasSize: Object
})

defineEmits(['import-data', 'reset-emblem'])

const { locale, t: $t } = useI18n()
const showLangMenu = ref(false)

const languages = ref([
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
])

const filteredLanguages = computed(() =>
  languages.value.filter(l => l.code !== String(locale.value))
)

function getFlag(code) {
  const l = languages.value.find(x => x.code === String(code))
  return l ? l.flag : '🌐'
}
</script>

<style scoped>
.toolbar-row {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.lang-switcher {
  margin-left: auto;
  position: relative;
}

.lang-flag {
  font-size: 20px;
  line-height: 1;
}

.lang-menu {
  position: absolute;
  top: 36px;
  left: 0;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px #0002;
  min-width: 140px;
  z-index: 100;
}

.lang-menu-item {
  background: none;
  border: none;
  width: 100%;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-menu-item:hover {
  background: #f5f5f5;
}

.icon-left-gap {
  margin-right: 6px;
}

.btn {
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}
</style>
