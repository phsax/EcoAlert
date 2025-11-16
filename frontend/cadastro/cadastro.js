async function cadastrar(event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const sobrenome = document.getElementById('sobrenome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (!nome || !sobrenome || !email || !senha) {
        alert("Todos os campos devem ser preenchidos!")
        return;
    }

    const data = {
        nome: nome,
        sobrenome: sobrenome,
        email: email,
        senha: senha
    };

    if (!confirmarSenha()) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3005/usuario/cadastrar', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            window.location.href = "/frontend/login/login.html"
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (error) {
        console.error('Erro durante o cadastro:', error);
        alert("Ocorreu um erro ao tentar realizar o cadastro.")
    }
}

function confirmarSenha() {
    const senha = document.getElementById('senha').value;
    const confSenha = document.getElementById('confSenha').value;

    if (senha === confSenha) {
        return true;
    } else {
        alert("As senhas não são compatíveis. Por favor, verifique e tente novamente.");
        return false;
    }
}