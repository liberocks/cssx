<script setup lang="ts">
import * as cssx from '@cssxio/cssx';
import { sx } from '@cssxio/cssx';
import { ref } from 'vue';

const count = ref(0);
const styles = cssx.create({
  page: 'flex min-h-[100vh] flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center text-slate-100',
  title: 'text-3xl font-semibold',
  card: 'flex flex-col items-center gap-4 rounded-xl bg-white p-6 text-slate-950 shadow-xl',
});
const page = cssx.props(styles.page);
const title = cssx.props(styles.title);
const card = cssx.props(styles.card);
</script>

<template>
  <main :class="page.className">
    <h1 :class="title.className">Vue + CSSX</h1>
    <section :class="card.className">
      <p>CSSX compiles script setup styles and template <code>sx()</code> calls.</p>
      <button
        :class="sx('rounded-md bg-brand px-4 py-2 font-medium text-white hover:scale-105', count > 0 && 'ring-2')"
        @click="count += 1"
      >
        count is {{ count }}
      </button>
    </section>
  </main>
</template>
