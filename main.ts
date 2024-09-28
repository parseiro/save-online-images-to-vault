import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import fetch from 'node-fetch';
// import {Blob,} from 'fetch-blob/from.js';

export default class MyPlugin extends Plugin {

	async onload() {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view: MarkdownView) => {

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
						item.setTitle("Save Remote Images")
							.setIcon("image-file")
							.onClick(async () => {
								return this.replaceImagesAsFiles(editor, view, selectedText);
							});
					});
				}
			})
		);
	}

	async replaceImagesAsFiles(editor: Editor, view: MarkdownView, content: string) {
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

		const vault = this.app.vault;
		while ((match = imageRegex.exec(content)) !== null) {
			const url = match[1] || match[2];
			// console.log('Vou baixar:', url);

			try {
				const response = await fetch(url);
				// console.log('response:', response);
				if (!response.ok) {
					new Notice('Error downloading image');
					continue;
				}
				const blob = await response.blob();

				const fileContent = await blob.arrayBuffer();
				const fileExtension = mimeToExt[blob.type] || 'bin';
				const fileName = `${await sha256(fileContent)}.${fileExtension}`;

				const currentFilePath = view.file?.path ?? '/';
				const directoryPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
				const imagesDirectory = `${directoryPath}/images`;

				await this.createDirectoryIfNotExists(imagesDirectory);

				const filePath = `${imagesDirectory}/${fileName}`;

				try {
					await vault.createBinary(filePath, fileContent);
				} catch (error) {
					if (error.message === "File already exists.") {
						const file = vault.getAbstractFileByPath(filePath);
						if (file) {
							await vault.delete(file, true);
							await vault.createBinary(filePath, fileContent);
						}
					} else {
						throw error;
					}
					// console.log(`Erro (${typeof error}):`, error.message);
				}

				newContent = newContent.replace(url, `images/${fileName}`);
				console.log(`Imagem salva como: images/${fileName}`);
			} catch (error) {
				console.error(`Erro ao salvar imagem: ${url}`, error);
			}
		}
		editor.replaceSelection(newContent);
	}

	async createDirectoryIfNotExists(directoryPath: string) {
		const vault = this.app.vault;
		const folder = vault.getAbstractFileByPath(directoryPath);
		if (!folder) {
			await vault.createFolder(directoryPath);
		}
	}
}

async function sha256(arrayBuffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}
