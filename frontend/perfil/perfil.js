document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('perfil-form');
    const nomeInput = document.getElementById('nome');
    const sobrenomeInput = document.getElementById('sobrenome');
    const emailInput = document.getElementById('email');
    const senhaAtualInput = document.getElementById('senha_atual');
    const novaSenhaInput = document.getElementById('nova_senha');
    const confirmaNovaSenhaInput = document.getElementById('confirma_nova_senha');
    const userNameElement = document.querySelector('.perfil p');

    let userId = null;
    let userRole = 'guest';

    function loadUserData() {
        const userStored = localStorage.getItem('user');
        if (userStored) {
            try {
                const user = JSON.parse(userStored);
                userId = user.id;
                userRole = user.role;

                nomeInput.value = user.nome || '';
                sobrenomeInput.value = user.sobrenome || '';
                emailInput.value = user.email || '';

                const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim();
                if (userNameElement && fullName) {
                    userNameElement.textContent = fullName;
                }

                if (!userId) {
                    alert("Erro: ID do usuário não encontrado. Faça login novamente.");
                    window.location.href = "../login/login.html";
                }

            } catch (e) {
                console.error("Erro ao carregar contexto do usuário.", e);
                alert("Erro ao carregar dados do usuário.");
                window.location.href = "../cadastro/cadastro.html";
            }
        } else {
            alert("Você precisa estar logado para editar seu perfil.");
            window.location.href = "../login/login.html";
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const newNome = nomeInput.value.trim();
        const newSobrenome = sobrenomeInput.value.trim();
        const newEmail = emailInput.value.trim();
        const senhaAtual = senhaAtualInput.value.trim();
        const novaSenha = novaSenhaInput.value.trim();
        const confirmaNovaSenha = confirmaNovaSenhaInput.value.trim();

        if (novaSenha || senhaAtual) {
            if (!senhaAtual || !novaSenha || !confirmaNovaSenha) {
                alert("Para alterar a senha, preencha a Senha Atual, Nova Senha e Confirmação de Nova Senha.");
                return;
            }
            if (novaSenha !== confirmaNovaSenha) {
                alert("A Nova Senha e a Confirmação de Nova Senha não correspondem.");
                return;
            }
        } else if (senhaAtual) {
            alert("Preencha o campo 'Nova Senha' para prosseguir com a alteração.");
            return;
        }

        const payload = {
            nome: newNome,
            sobrenome: newSobrenome,
            email: newEmail,
            senha_atual: senhaAtual,
            nova_senha: novaSenha
        };

        Object.keys(payload).forEach(key => {
            if (payload[key] === '' || payload[key] === null) {
                delete payload[key];
            }
        });

        try {
            const apiUrl = `http://localhost:3005/user/perfil/${userId}`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert(result.message);

                if (result.relogin_required) {
                    localStorage.removeItem('user');
                    window.location.href = "../login/login.html";
                } else if (result.new_user_data) {
                    const oldUser = JSON.parse(localStorage.getItem('user'));
                    const updatedUser = { ...oldUser, ...result.new_user_data };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    loadUserData(); 

                    senhaAtualInput.value = '';
                    novaSenhaInput.value = '';
                    confirmaNovaSenhaInput.value = '';
                }

            } else {
                alert(`Erro ao salvar perfil: ${result.message}` || "Erro desconhecido.");
            }

        } catch (error) {
            console.error('Erro de conexão ao salvar perfil:', error);
            alert('Erro ao tentar conectar com o servidor.');
        }
    });

    loadUserData();
});