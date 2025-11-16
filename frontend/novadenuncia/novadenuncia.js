document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type'); 

    const pageTitle = document.getElementById('page-title');
    const publishText = document.getElementById('publish-text');

    const noticiaFields = document.getElementById('noticia-fields');
    const denunciaFields = document.getElementById('denuncia-fields');
    const linkInput = document.getElementById('conteudo-link');
    const textInput = document.getElementById('conteudo-texto');
    const linkWrapper = document.querySelector('.link-input');
    const textWrapper = document.querySelector('.texto-input');
    const contentTypeRadios = document.querySelectorAll('input[name="content-type"]');

    const userStored = localStorage.getItem('user');
    let userId = null;
    let userRole = 'guest';

    if (userStored) {
        try {
            const user = JSON.parse(userStored);
            userId = user.id;
            userRole = user.role;

            const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim();
            const userNameElement = document.querySelector('.perfil p');
            if (userNameElement && fullName) {
                userNameElement.textContent = fullName;
            }
        } catch (e) {
            console.error("Erro ao analisar o objeto do usuário:", e);
            localStorage.removeItem('user');
            window.location.href = "/frontend/login/login.html";
            return;
        }
    } else {
        window.location.href = "/frontend/login/login.html";
        return;
    }

    function setupContentTypeSwitch() {
        const initialType = document.querySelector('input[name="content-type"]:checked')?.value || 'link';

        if (initialType === 'link') {
            linkWrapper.style.display = 'block';
            textWrapper.style.display = 'none';
            textInput.required = false;
            linkInput.required = true;
        } else {
            linkWrapper.style.display = 'none';
            textWrapper.style.display = 'block';
            linkInput.required = false;
            textInput.required = true;
        }

        contentTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isLink = e.target.value === 'link';
                if (isLink) {
                    linkWrapper.style.display = 'block';
                    textWrapper.style.display = 'none';
                    textInput.required = false;
                    linkInput.required = true;
                } else { 
                    linkWrapper.style.display = 'none';
                    textWrapper.style.display = 'block';
                    linkInput.required = false;
                    textInput.required = true;
                }
            });
        });
    }


    if (contentType === 'noticia') {
        if (userRole !== 'admin') {
            alert('Acesso negado. Apenas administradores podem adicionar notícias.');
            window.location.href = "/frontend/home/home.html";
            return;
        }
        pageTitle.textContent = 'Nova Notícia';
        publishText.textContent = 'Publicar Notícia';
        denunciaFields.style.display = 'none';
        noticiaFields.style.display = 'block';

    } else if (contentType === 'denuncia') {
        pageTitle.textContent = 'Nova Denúncia';
        publishText.textContent = 'Publicar Denúncia';
        denunciaFields.style.display = 'block';
        noticiaFields.style.display = 'block';

    } else {
        alert('Tipo de conteúdo inválido. Redirecionando para Home.');
        window.location.href = "/frontend/home/home.html";
        return;
    }

    setupContentTypeSwitch();
});

async function publishContent(event) {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type');

    // console.log(contentType)

    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.id;
    const userRole = user?.role;

    if (!userId) {
        alert("Usuário não logado.");
        return;
    }

    // console.log(userId)

    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const imagemFile = document.getElementById('imagem').files[0];

    const linkInput = document.getElementById('conteudo-link');
const textInput = document.getElementById('conteudo-texto');
const conteudoLink = linkInput.value.trim();
const conteudoTexto = textInput.value.trim();
const tipoConteudo = document.querySelector('input[name="content-type"]:checked').value;

    if (!titulo || !descricao || !imagemFile) {
        alert("Título, descrição e imagem são obrigatórios!");
        return;
    }

    if (tipoConteudo === 'link' && !conteudoLink) {
        alert("A URL é obrigatória!");
        return;
    }
    if (tipoConteudo === 'texto' && !conteudoTexto) {
        alert("O conteúdo de texto próprio é obrigatório!");
        return;
    }


    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('titulo', titulo);
    formData.append('descricao', descricao);
    formData.append('imagem', imagemFile);

    formData.append('tipo_conteudo', tipoConteudo);
    formData.append('conteudo_link', tipoConteudo === 'link' ? conteudoLink : '');
    formData.append('conteudo_texto', tipoConteudo === 'texto' ? conteudoTexto : '');


    let apiUrl = '';
    let successMessage = '';
    let isDenunciaAdmin = false;


    if (contentType === 'denuncia') {
        console.log("entrou no tipo:", contentType)

        // console.log(userRole)

        if (userRole === 'admin') {
            apiUrl = 'http://localhost:3005/denuncia/criar/adm';
            successMessage = "Denúncia publicada com sucesso!";
            isDenunciaAdmin = true;
            formData.append('aprovacao_direta', 'true');
        } else {
            apiUrl = 'http://localhost:3005/denuncia/criar/user ';

            successMessage = "Denúncia enviada! Aguarde a moderação.";
            // window.location.href = '../home/home.html'
            formData.append('aprovacao_direta', 'false');
        }

    } else if (contentType === 'noticia') {
        apiUrl = 'http://localhost:3005/noticia/criar';
        successMessage = "Notícia publicada com sucesso!";
        formData.append('aprovacao_direta', 'true');

    } else {
        alert("Erro: Tipo de conteúdo desconhecido.");
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {

            if (!isDenunciaAdmin) {
                alert(successMessage);
            }

            window.location.href = "/frontend/home/home.html";
        } else {
            alert(`Erro ao publicar: ${result.message}`);
        }
    } catch (error) {
        console.error("Erro na comunicação:", error);
        alert("Erro ao tentar conectar com o servidor.");
    }
}