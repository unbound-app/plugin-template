import { showAlert } from '@unbound/dialogs';
import { Redesign } from '@unbound/metro/components';
import Test from 'react-native-reanimated';

class Plugin implements Plugin {
	start() {
		Test
		showAlert({
			title: 'Hello!',
			content: <ReactNative.Text>
				Plugin has started.
			</ReactNative.Text>
		});
	}

	stop() {
		showAlert({
			title: 'Goodbye!',
			content: <ReactNative.Text>
				Plugin has stopped.
			</ReactNative.Text>
		});
	}

	settings() {
		const store = settings.useSettingsStore();
		const taps = store.get('taps', 0);

		return <Redesign.Button
			onPress={() => store.set('taps', taps + 1)}
		>
			{store.get('taps', 0)} taps
		</Redesign.Button>;
	}
}

export default Plugin;