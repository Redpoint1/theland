<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    maxWidth?: string
    align?: 'center' | 'left' | 'right'
    placement?: 'top' | 'bottom'
    teleport?: boolean
  }>(),
  {
    maxWidth: '340px',
    align: 'center',
    placement: 'top',
    teleport: false,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const portalStyle = ref<Record<string, string>>({})

const computePortalStyle = () => {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()

  let left = rect.left + rect.width / 2
  let top = rect.top - 8
  let transform = 'translate(-50%, -100%)'

  if (props.align === 'left') {
    left = rect.left
    transform = 'translate(0, -100%)'
  } else if (props.align === 'right') {
    left = rect.right
    transform = 'translate(-100%, -100%)'
  }

  if (props.placement === 'bottom') {
    top = rect.bottom + 8
    if (props.align === 'center') transform = 'translate(-50%, 0)'
    if (props.align === 'left') transform = 'translate(0, 0)'
    if (props.align === 'right') transform = 'translate(-100%, 0)'
  }

  portalStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform,
    maxWidth: props.maxWidth,
  }
}

const handleWindowChange = () => {
  if (!isOpen.value || !props.teleport) return
  computePortalStyle()
}

const openTooltip = () => {
  isOpen.value = true
  if (!props.teleport) return
  computePortalStyle()
  window.addEventListener('scroll', handleWindowChange, true)
  window.addEventListener('resize', handleWindowChange)
}

const closeTooltip = () => {
  isOpen.value = false
  window.removeEventListener('scroll', handleWindowChange, true)
  window.removeEventListener('resize', handleWindowChange)
}

const onFocusOut = (event: FocusEvent) => {
  const next = event.relatedTarget as Node | null
  if (next && rootRef.value?.contains(next)) return
  closeTooltip()
}

watch(
  () => [props.align, props.placement, props.maxWidth, props.teleport],
  () => {
    if (isOpen.value && props.teleport) {
      computePortalStyle()
    }
  },
)

onBeforeUnmount(() => {
  closeTooltip()
})
</script>

<template>
  <div
    ref="rootRef"
    class="info-tooltip-root"
    :class="[`align-${align}`, `placement-${placement}`]"
    tabindex="0"
    @mouseenter="openTooltip"
    @mouseleave="closeTooltip"
    @focusin="openTooltip"
    @focusout="onFocusOut"
  >
    <div ref="triggerRef" class="info-tooltip-trigger">
      <slot name="trigger" />
    </div>
    <div v-if="!teleport" class="info-tooltip-panel" :style="{ maxWidth }">
      <slot name="content" />
    </div>
  </div>

  <Teleport to="body">
    <div v-if="teleport && isOpen" class="info-tooltip-portal" :style="portalStyle">
      <slot name="content" />
    </div>
  </Teleport>
</template>

<style scoped>
.info-tooltip-root {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  outline: none;
}

.info-tooltip-trigger {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.info-tooltip-panel {
  position: absolute;
  display: block;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 40;
  background: rgba(10, 16, 28, 0.98);
  border: 1px solid rgba(90, 110, 140, 0.45);
  border-radius: 12px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
  padding: 0.7rem 0.8rem;
  min-width: 230px;
  min-height: 0;
  height: auto;
  max-height: none;
  overflow: visible;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.35;
  text-align: left;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.info-tooltip-portal {
  position: fixed;
  display: block;
  background: rgba(10, 16, 28, 0.98);
  border: 1px solid rgba(90, 110, 140, 0.45);
  border-radius: 12px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
  padding: 0.7rem 0.8rem;
  min-width: 230px;
  min-height: 1px;
  height: auto;
  max-height: none;
  overflow: visible;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.35;
  text-align: left;
  opacity: 1;
  pointer-events: none;
  z-index: 3000;
}

.info-tooltip-root.placement-bottom .info-tooltip-panel {
  bottom: auto;
  top: calc(100% + 8px);
}

.info-tooltip-root.align-left .info-tooltip-panel {
  left: 0;
  transform: translateX(0);
}

.info-tooltip-root.align-right .info-tooltip-panel {
  left: auto;
  right: 0;
  transform: translateX(0);
}

.info-tooltip-root:hover .info-tooltip-panel,
.info-tooltip-root:focus-within .info-tooltip-panel,
.info-tooltip-root:focus .info-tooltip-panel {
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

.info-tooltip-root.placement-bottom:hover .info-tooltip-panel,
.info-tooltip-root.placement-bottom:focus-within .info-tooltip-panel,
.info-tooltip-root.placement-bottom:focus .info-tooltip-panel {
  transform: translateX(-50%) translateY(2px);
}

.info-tooltip-root.align-left:hover .info-tooltip-panel,
.info-tooltip-root.align-left:focus-within .info-tooltip-panel,
.info-tooltip-root.align-left:focus .info-tooltip-panel,
.info-tooltip-root.align-right:hover .info-tooltip-panel,
.info-tooltip-root.align-right:focus-within .info-tooltip-panel,
.info-tooltip-root.align-right:focus .info-tooltip-panel {
  transform: translateY(-2px);
}

.info-tooltip-root.align-left.placement-bottom:hover .info-tooltip-panel,
.info-tooltip-root.align-left.placement-bottom:focus-within .info-tooltip-panel,
.info-tooltip-root.align-left.placement-bottom:focus .info-tooltip-panel,
.info-tooltip-root.align-right.placement-bottom:hover .info-tooltip-panel,
.info-tooltip-root.align-right.placement-bottom:focus-within .info-tooltip-panel,
.info-tooltip-root.align-right.placement-bottom:focus .info-tooltip-panel {
  transform: translateY(2px);
}

:slotted(.info-tooltip-title) {
  font-weight: 600;
  color: #e9f2ff;
  margin-bottom: 0.35rem;
}

:slotted(.info-tooltip-line) {
  font-size: 0.8rem;
  color: #c7d4f2;
  margin-bottom: 0.2rem;
}

:slotted(.info-tooltip-line:last-child) {
  margin-bottom: 0;
}

:slotted(.info-tooltip-muted) {
  color: #8fa2c6;
}
</style>
