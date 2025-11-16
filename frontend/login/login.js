// ---funcao logar---
async function logar(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    const data = { email, senha };
    try {
        const response = await fetch('http://localhost:3005/usuario/logar', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("user", JSON.stringify(result.user));
            window.location.href = "/frontend/home/home.html";

            alert(result.message);
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro ao realizar login.");
    }
}

// ---funcao logar---