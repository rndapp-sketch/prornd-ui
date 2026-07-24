fetch("http://127.0.0.1:8000/api/resource/Budget%20Head?fields=[\"budget_head\",\"id\"]")
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
