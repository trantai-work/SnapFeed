import { useState } from "react";

function Home() {
  const [result, setResult] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Error: " + error.toString());
    }
  };

  return (
    <div>
      <h1>Home</h1>
      <button onClick={fetchUsers}>Call /api/v1/users</button>
      {result && (
        <pre>{result}</pre>
      )}
    </div>
  );
}

export default Home;