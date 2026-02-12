<template>
  <div>
    <h1>SSR Corporate Site</h1>
    <p>Welcome to our corporate site powered by Nuxt 3 SSR.</p>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Home | SSR Corporate Site",
  meta: [
    {
      name: "description",
      content: "SSR Corporate Site - Nuxt 3 SSR demo",
    },
  ],
});
</script>
