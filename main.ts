import {MarkdownView, Menu, Notice, Plugin, TAbstractFile, WorkspaceLeaf} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {


		// this.addRibbonIcon("dice", "Print to console", () => {
		// 	console.log("Hello, you! 2");
		// 	new Notice('Olá');
		// });

		// this.registerEvent(
		// 	this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
		// 		new Notice('Olá');
		// 	})
		// )

		// this.registerEvent(
		// 	this.app.workspace.on("editor-menu", (menu, editor, view) => {
		// 		new Notice('Olá');
		// 		console.log("editor-menu triggered");
		//
		// 		if (!view || !(view instanceof MarkdownView)) {
		// 			console.log("Not a Markdown view, skipping...");
		// 			return;
		// 		}
		//
		// 		menu.addItem((item) => {
		// 			item
		// 				.setTitle("LEONARDO")
		// 				.setIcon("document")
		// 				.onClick(async () => {
		// 					console.log('olá mundo');
		// 					new Notice(view?.file?.path ?? 'nada');
						// });
				// });
			// })
		// );
		// new Notice('onload');

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

	// onunload() {
	//
	// }

	// async loadSettings() {
	// 	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	// }

	// async saveSettings() {
	// 	await this.saveData(this.settings);
	// }

	// Função para converter uma imagem selecionada em Base64
	async convertImageToBase64(editor: CodeMirror.Editor, content: string) {
		const imageRegex = /!\[.*?\]\((https?:\/\/.*?)\)|<img .*?src="(https?:\/\/.*?)"/g;
		let match;
		let newContent = content;

		// Encontra a URL da imagem
		while ((match = imageRegex.exec(content)) !== null) {
			const url = match[1] || match[2];
			// console.log('Vou tentar baixar:', url);

			try {
				// Baixar a imagem
				const response = await fetch(url,
					{mode: 'no-cors'}
				);
				console.log('response:', response);
				// if (!response.ok) {
				// 	new Notice('Error downloading image');
				// 	return;
				// }
				const blob = await response.blob();
				console.log('Consegui baixar o blob', blob);

				// Converter para Base64
				const base64 = await this.blobToBase64(blob);
				const mimeType = blob.type;

				// Substituir a URL pela string Base64
				const base64String = `data:${mimeType};base64,${base64}`;
				newContent = newContent.replace(url, base64String);

				// Atualiza o conteúdo no editor
				// editor.replaceSelection(newContent);
			} catch (error) {
				console.error(`Erro ao converter imagem: ${url}`, error);
			}
		}
	}

	// Função auxiliar para converter Blob em Base64
	async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result!.toString().split(',')[1]);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}
}
