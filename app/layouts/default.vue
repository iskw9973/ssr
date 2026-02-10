<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p>&copy; 2025 SSR Corporate Site</p>
    </footer>
  </div>
</template>
