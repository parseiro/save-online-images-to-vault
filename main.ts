import {Notice, Plugin} from 'obsidian';
import fetch from 'node-fetch';
import {Blob,} from 'fetch-blob/from.js';

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
								return this.saveImageAsFile(editor, selectedText);
							});
					});
				}
			})
		);
	}

	async saveImageAsFile(editor, content: string) {
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
				// console.log('A resposta é do tipo:', typeof blob)
				console.log('blob recebido', blob);
				if (!isBlob) {
					new Notice('A resposta não é do tipo Blob.');
					continue;
				}

				// Criar um nome único para o arquivo
				const fileName = `${await sha256(url)}.png`;
				const filePath = `${this.app.vault.getRoot().path}/${fileName}`;

				// Salvar o Blob como um arquivo
				await this.saveBlobToFile(blob, filePath);

				// Substituir a URL pela referência ao arquivo
				newContent = newContent.replace(url, fileName);
				editor.replaceSelection(newContent);
				console.log(`Imagem salva como: ${fileName}`);
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

	async saveBlobToFile(blob: Blob, filePath: string) {
		const fileContent = await this.blobToText(blob);
		const file = new TFile(filePath);
		await this.app.vault.create(file.path, fileContent);
	}

	async blobToText(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsText(blob);
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

async function sha256(message: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}
