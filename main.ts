import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import fetch from 'node-fetch';
// import {Blob,} from 'fetch-blob/from.js';

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
								return this.saveImageAsFile(editor, view, selectedText);
							});
					});
				}
			})
		);
	}

	async saveImageAsFile(editor: Editor, view: MarkdownView, content: string) {
		const imageRegex = /!\[.*?\]\((https?:\/\/.*?)\)|<img .*?src="(https?:\/\/.*?)"/g;
		let match;
		let newContent = content;

		const mimeToExt: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp',
			'image/bmp': 'bmp',
			'image/svg+xml': 'svg',
		};

		while ((match = imageRegex.exec(content)) !== null) {
			const url = match[1] || match[2];
			console.log('Vou tentar baixar:', url);

			try {
				const response = await fetch(url);
				console.log('response:', response);
				if (!response.ok) {
					new Notice('Error downloading image');
					continue;
				}
				const blob = await response.blob();

				const fileExtension = mimeToExt[blob.type] || 'bin';
				const fileName = `${await sha256(url)}.${fileExtension}`;

				const currentFilePath = view.file?.path ?? '/';
				const directoryPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));

				const imagesDirectory = `${directoryPath}/images`;

				await this.createDirectoryIfNotExists(imagesDirectory);

				const filePath = `${imagesDirectory}/${fileName}`;

				await this.saveBlobToFile(blob, filePath);

				newContent = newContent.replace(url, `images/${fileName}`);
				editor.replaceSelection(newContent);
				console.log(`Imagem salva como: images/${fileName}`);
			} catch (error) {
				console.error(`Erro ao salvar imagem: ${url}`, error);
			}
		}
	}

	async saveBlobToFile(blob: Blob, filePath: string) {
		const fileContent = await blob.arrayBuffer();
		await this.app.vault.createBinary(filePath, fileContent);
	}

	async createDirectoryIfNotExists(directoryPath: string) {
		const folder = this.app.vault.getAbstractFileByPath(directoryPath);
		if (!folder) {
			await this.app.vault.createFolder(directoryPath);
		}
	}
}

async function sha256(message: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

