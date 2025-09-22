<script lang="ts" setup>
import { ref } from 'vue';

const emits = defineEmits<{
  addTask: [newTask: string]
}>();
const newTask = ref("");
const input_error = ref("")

function formSubmitted() {
  if (newTask.value.trim()){
    emits("addTask", newTask.value.trim());
    newTask.value = "";
  }
  else {
    input_error.value = "Task cannot be empty!!"
  }
}

</script><template>
  <form @submit.prevent="formSubmitted">
  <label>
    New Training Task
    <input v-model="newTask" :aria-invalid="!!input_error || undefined" @input="input_error=''" name="newTask">
    <small v-if="input_error" id="invalid-helper">
      {{ input_error }}
    </small>
    <div class="button-container">
      <button>Add</button>
    </div>
  </label>

</form>
</template>
