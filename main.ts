import {Notice, Plugin} from 'obsidian';
import fetch from 'node-fetch';
import {
	Blob,
} from 'fetch-blob/from.js';

export default class MyPlugin extends Plugin {

	async onload() {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {

				// console.info('Clicou no menu de contexto');
				if (!view) {
					console.error('Não há view');
					return;
				}
				if (!editor) {
					console.error('Não há editor');
					return;
				}
				const selectedText = editor.getSelection();
				// console.log('Selecionou o texto:', selectedText);
				const imageRegex = /!\[.*?\]\((https?:\/\/.*?)\)|<img .*?src="(https?:\/\/.*?)"/;
				if (imageRegex.test(selectedText)) {
					menu.addItem((item) => {
						item.setTitle("Convert Image to Base64")
							.setIcon("image-file")
							.onClick(async () => {
								// console.log('onClick');
								return this.convertImageToBase64(editor, selectedText);
							});
					});
				}
			})
		);
	}

	async convertImageToBase64(editor, content: string) {
		const imageRegex = /!\[.*?\]\((https?:\/\/.*?)\)|<img .*?src="(https?:\/\/.*?)"/g;
		let match;
		let newContent = content;

		// Encontra a URL da imagem
		while ((match = imageRegex.exec(content)) !== null) {
			const url = match[1] || match[2];
			// console.log('Vou tentar baixar:', url);

			try {
				// Baixar a imagem
				const response = await fetch(url);
				console.log('response:', response);
				if (!response.ok) {
					new Notice('Error downloading image');
					continue;
				}
				const blob = await response.blob();
				const isBlob = blob instanceof Blob;
				console.log('é do tipo blob: ', isBlob);
				console.log('A resposta é do tipo:', typeof blob)
				console.log('blob recebido', blob);
				if (!isBlob) {
					new Notice('A resposta não é do tipo Blob.');
					continue;
				}


				// Converter para Base64
				// const base64 = await this.blobToBase64(blob);
				// @ts-ignore
				const base64: string = await bytesToBase64DataUrl(await blob.text(), blob.type);

				newContent = newContent.replace(url, base64);

				// Atualiza o conteúdo no editor
				// editor.replaceSelection(newContent);
				console.log("Converti para:", base64);
				editor.replaceSelection(newContent);
			} catch (error) {
				console.error(`Erro ao converter imagem: ${url}`, error);
			}
		}
	}

	async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onloadend = () => {
				// O resultado do FileReader já está em Base64, mas inclui o prefixo "data:". Vamos garantir que
				// estamos pegando apenas a parte Base64 correta da string.
				const result = reader.result as string;
				const base64Data = result.split(',')[1]; // Extrair apenas a parte Base64

				if (base64Data) {
					resolve(base64Data);
				} else {
					reject(new Error('Erro ao converter Blob para Base64.'));
				}
			};

			reader.onerror = () => {
				reject(new Error('Erro ao ler o Blob.'));
			};

			reader.readAsDataURL(blob); // Isso inicia a leitura do Blob como uma string Base64
		});
	}
}

async function bytesToBase64DataUrl(bytes: never, type = "application/octet-stream"): Promise<string | ArrayBuffer | null> {
	return await new Promise((resolve, reject) => {
		const reader = Object.assign(new FileReader(), {
			onload: () => resolve(reader.result),
			onerror: () => reject(reader.error),
		});
		reader.readAsDataURL(new File([bytes], "", {type}));
	});
}
