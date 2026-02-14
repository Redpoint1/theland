[1mdiff --git a/src/components/SkillCard.vue b/src/components/SkillCard.vue[m
[1mindex c2b7772..d1d58ee 100644[m
[1m--- a/src/components/SkillCard.vue[m
[1m+++ b/src/components/SkillCard.vue[m
[36m@@ -94,7 +94,6 @@[m [mconst details = computed(() => {[m
           </div>[m
         </template>[m
       </InfoTooltip>[m
[31m-      <div class="item-desc">{{ skill.description }}</div>[m
     </div>[m
     <div class="item-value">[m
       <div class="value">Lv. {{ skill.level }}</div>[m
[36m@@ -103,45 +102,3 @@[m [mconst details = computed(() => {[m
     </div>[m
   </div>[m
 </template>[m
[31m-[m
[31m-<style scoped>[m
[31m-.list-item {[m
[31m-  display: flex;[m
[31m-  justify-content: space-between;[m
[31m-  gap: 1rem;[m
[31m-  align-items: center;[m
[31m-}[m
[31m-[m
[31m-.item-title {[m
[31m-  font-weight: 600;[m
[31m-}[m
[31m-[m
[31m-.item-desc {[m
[31m-  font-size: 0.85rem;[m
[31m-  color: #8fa2c6;[m
[31m-}[m
[31m-[m
[31m-.item-value {[m
[31m-  text-align: right;[m
[31m-  min-width: 120px;[m
[31m-}[m
[31m-[m
[31m-.value {[m
[31m-  font-size: 1.6rem;[m
[31m-  font-weight: 600;[m
[31m-}[m
[31m-[m
[31m-.item-hint {[m
[31m-  font-size: 0.75rem;[m
[31m-  color: #7d90b8;[m
[31m-}[m
[31m-[m
[31m-@media (max-width: 720px) {[m
[31m-  .list-item,[m
[31m-  .item-value {[m
[31m-    flex-direction: column;[m
[31m-    align-items: flex-start;[m
[31m-    text-align: left;[m
[31m-  }[m
[31m-}[m
[31m-</style>[m
[1mdiff --git a/src/components/StatCard.vue b/src/components/StatCard.vue[m
[1mindex 464de96..8536a55 100644[m
[1m--- a/src/components/StatCard.vue[m
[1m+++ b/src/components/StatCard.vue[m
[36m@@ -15,7 +15,9 @@[m [mconst props = defineProps<{[m
 }>()[m
 [m
 const game = useGameStore()[m
[31m-const { maxHp, maxMana, maxInventorySlots } = storeToRefs(game)[m
[32m+[m[32mconst { maxHp, maxMana, maxInventorySlots, skillBonuses, stats } = storeToRefs(game)[m
[32m+[m
[32m+[m[32mconst toPercent = (value: number) => `${Math.round(value * 10000) / 100}%`[m
 [m
 const derivedLines = computed(() => {[m
   if (props.stat.name === 'Strength') {[m
[36m@@ -37,7 +39,12 @@[m [mconst derivedLines = computed(() => {[m
     ][m
   }[m
   if (props.stat.name === 'Spirit') {[m
[31m-    return ['Combat power contribution: +0.4 per level'][m
[32m+[m[32m    return [[m
[32m+[m[32m      'Combat power contribution: +0.4 per level',[m
[32m+[m[32m      `Passive HP regen base: floor(Spirit×0.6) = ${Math.max(1, Math.floor(props.stat.value * 0.6))}`,[m
[32m+[m[32m      `Rest HP regen base: floor(Spirit×1.2 + Vitality×0.4) = ${Math.max(2, Math.floor(props.stat.value * 1.2 + stats.value.Vitality.value * 0.4))}`,[m
[32m+[m[32m      `Global regen multiplier bonus: +${toPercent(skillBonuses.value.regenMultiplier - 1)}`,[m
[32m+[m[32m    ][m
   }[m
   return [[m
     'Max Mana contribution: +10 per level',[m
[36m@@ -69,7 +76,6 @@[m [mconst derivedLines = computed(() => {[m
           </div>[m
         </template>[m
       </InfoTooltip>[m
[31m-      <div class="item-desc">{{ stat.description }}</div>[m
     </div>[m
     <div class="item-value">[m
       <div class="value">+{{ stat.value }}</div>[m
[1mdiff --git a/src/stores/game/data.ts b/src/stores/game/data.ts[m
[1mindex c23bea7..1caed19 100644[m
[1m--- a/src/stores/game/data.ts[m
[1m+++ b/src/stores/game/data.ts[m
[36m@@ -57,7 +57,7 @@[m [mexport const createStats = (): Record<StatKey, Stat> => ({[m
     exp: 0,[m
     baseExpToNext: 100,[m
     expToNext: computeExpToNext(100, 0, 1.2, 15),[m
[31m-    description: 'Mana, willpower, recovery.',[m
[32m+[m[32m    description: 'Willpower, vitality recovery, and spiritual force in combat.',[m
   },[m
   Intelligence: {[m
     name: 'Intelligence',[m
