<template>
  <router-link to="/2d">2D</router-link>
  |
  <router-link to="/3d">3D</router-link>
  |
  &copy;<a href="https://github.com/MrThanlon/array-field" target="_blank">array-field</a>
  |
  License <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">AGPLv3</a>
  <router-view/>
</template>

<style>
table {
  border-collapse: collapse;
  border: 2px solid rgb(200,200,200);
  letter-spacing: 1px;
  font-size: 0.8rem;
}

td, th {
  border: 1px solid rgb(190,190,190);
}

th {
  background-color: rgb(235,235,235);
}

td {
  text-align: center;
}

tr:nth-child(even) td {
  background-color: rgb(250,250,250);
}

tr:nth-child(odd) td {
  background-color: rgb(245,245,245);
}
</style>
