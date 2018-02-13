import { h, Component } from 'preact'
import { Howl } from 'howler'
import './style.css'

const surah = require('./surah.json')

const renderSurahOption = () => {
	let options = []
	
	surah.forEach((val, idx) => {
		const { title, count } = val
		let value = JSON.stringify({index: idx + 1, count})
		
		options.push(<option value={value} >{ title }</option>)
	})

	return options
} 

const renderAyahOption = (count) => 
	Array.apply(null, Array(count)).map((_, idx) => <option value={idx + 1}>{ idx + 1 }</option>)		


export default class App extends Component {
        constructor (props) {
                super(props)

		this.player = null
		this.startFetch()
        }

        state = {
		ready: false,
		playing: false,

		surah: 1,
		ayah: 1,
		ayahCount: 7
        }

        startFetch = () => {
                const { surah, ayah } = this.state

		this.player && this.player.stop()
		this.player = null
		this.setState({ ready: false, playing: false })

                this.getAyah(surah, ayah)
        }

        getAyah = (surah, ayah) => {
                let key = `${surah}:${ayah}`
                let local = localStorage.getItem(key)

                if (!local) {
			this.fetchApi(key)
                } else {
			this.setState({ ready: true })
			this.parseAudio(local)
                }
        }

        fetchApi = (key) => {
                fetch(`https://api.alquran.cloud/ayah/${key}/ar.abdulbasitmurattal`).then(res => {
                        res.json().then(r => this.fetchAudio(key, r.data.audio))
                }).catch(err => alert('Something wrong'))
        }

        fetchAudio = (key, url) => {
		url = url.replace(/https?/, 'https')
                fetch(url).then(res => res.arrayBuffer().then(buf => {
                        let encoded = btoa(String.fromCharCode(...new Uint8Array(buf)))

			localStorage.setItem(key, encoded)
			this.setState({ ready: true })

                        this.parseAudio(encoded)
                })).catch(err => alert('Something wrong'))
        }

        parseAudio = (encoded) => {
		this.player = new Howl({
			src: [`data:audio/mp3;base64,${encoded}`],
			loop: true
		})
        }

        play = () => {
		this.player.playing() ? this.player.pause() : this.player.play()
		
		this.setState({
			playing: this.player.playing()
		})
	}

	onChangeSurah = (e) => {
		let value = JSON.parse(e.target.value)

		this.setState({ 
			surah: value.index,
			ayah: 1,
			ayahCount: value.count
		})

		this.startFetch()

	}

        onChangeAyah = (e) => {
		this.setState({ ayah: e.target.value })

		this.startFetch()
	}

        render({}, { ayah, ayahCount, ready, playing }) {
                return (
                        <div id="app">
				<div class="nice">
					<h1>Ayah Player</h1>
				</div>

				<select class="nice" onChange={this.onChangeSurah}>
					{ renderSurahOption() }
				</select>

				<select class="nice" onChange={this.onChangeAyah} value={ayah}>
					{ renderAyahOption(ayahCount) }
				</select>

				<button class="nice" disabled={!this.player} onClick={this.play} >
					{ ready ? (playing ? 'pause' : 'play') : 'fetching' }
				</button>
                        </div>
                );
        }
}
