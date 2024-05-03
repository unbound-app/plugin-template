class Plugin {
	start() {
		alert('Started!');
	}

	stop() {
		alert('Stopped!');
	}

	getSettingsPanel() {
		const store = settings.useSettingsStore();
		const count = store.get('count', 0);

		return <ReactNative.View>
			<ReactNative.Button title='Click Me' />
			{count} clicks
		</ReactNative.View>;
	}
}

export default Plugin;
export const hey = {};