import {Chapter, LanguageCode, Manga, MangaStatus, MangaTile, Tag, TagSection} from 'paperback-extensions-common'

const READCOMICTO_DOMAIN = 'https://readcomiconline.to'

export class Parser {

    parseMangaDetails($: CheerioSelector, mangaId: string): Manga {
    

    let titles =  [$('.bigChar', $('.bigBarContainer').first()).text().trim()]
    let image = `${READCOMICTO_DOMAIN}${$('img', $('.rightBox')).attr('src')}`


    let status = MangaStatus.ONGOING, author, released, rating: number = 0,artist, views,summary

    let tagArray0 : Tag[] = []
    let i = 0
    let infoElement = $("div.barContent").first()
    artist =this.decodeHTMLEntity($('p:has(span:contains(Artist:)) > a', infoElement).first().text())
    author = ($('p:has(span:contains(Writer:)) > a', infoElement).first().text())
    summary = ($('p:has(span:contains(Summary:)) ~ p', infoElement).text())
    released = this.decodeHTMLEntity($('p:has(span:contains(Publication date:))', infoElement).first().text()).replace('Publication date:', '').trim()
    
    let statusViewsParagraph = $('p:has(span:contains(Status:))', infoElement).first().text().toLowerCase()
    status = statusViewsParagraph.includes('ongoing') ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    views = Number(statusViewsParagraph.replace('\n', '').split('\n')[1]?.trim()?.replace(/\D/g, ''))

    let genres = $('p:has(span:contains(Genres:)) > a', infoElement).toArray()
    for (let obj of genres) {
        let id = $(obj).attr('href')
        let label = this.decodeHTMLEntity($(obj).text().trim())
        if (typeof id === 'undefined' || typeof label === 'undefined') continue
        tagArray0 = [...tagArray0, createTag({id: id, label: label})]
    }
    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 })]
      return createManga({
        id: mangaId,
        rating: rating,
        titles: titles,
        image: image ?? '',
        status: status,
        author: this.decodeHTMLEntity(author ?? ''),
        artist: artist,
        views: views,
        tags: tagSections,
        desc: this.decodeHTMLEntity(summary ?? ''),
        lastUpdate: released
      })
    }
   

    parseChapterList($: CheerioSelector, mangaId: string) : Chapter[] { 
    
    let chapters: Chapter[] = []

    let chapArray = $('tr', $('.listing').first()).toArray().reverse()
    for(let i = 0; i < chapArray.length; i++) {
           let obj = chapArray[i]
           let chapterId = $('a', obj)?.first().attr('href')?.replace(`/Comic/${mangaId}/`, '')
           let chapter = $('td', obj).first()
           let chapNum = i + 1
           let chapName = chapter.text().trim()
           let time = $('td', $(obj)).last().text().trim()
           if (typeof chapterId === 'undefined') continue
           chapters.push(createChapter({
               id: chapterId,
               mangaId: mangaId,
               chapNum: Number(chapNum),
               langCode: LanguageCode.ENGLISH,
               name: this.decodeHTMLEntity(chapName),
               time: new Date(time)
           }))
       }
       return chapters
}





    parseChapterDetails(data: string) : string[] {
        
      let pages = data.match(/lstImages.push("(http.*)")/g)
      if(!pages) return ['']
      if (typeof pages === 'string') pages = ['', pages]
      return pages.slice(1)
    }


    parseSearchResults($: CheerioSelector, cheerio: any): MangaTile[] { 
        let mangaTiles: MangaTile[] = []
        let collectedIds: string[] = []
        for(let obj of $('tr', $('.listing')).toArray()) {
            
            let titleText = this.decodeHTMLEntity($('a',$(obj)).text().replace('\n','').trim())
            let id = $('a',$(obj)).attr('href')?.replace('/Comic/', '')
            if(!titleText) { 
              continue
            
            }
            //Tooltip Selecting 
            let imageCheerio = cheerio.load($('td', $(obj)).first().attr('title') ?? '')
            let image = `${READCOMICTO_DOMAIN}${imageCheerio('img').attr('src')}`

            if (typeof id === 'undefined' || typeof image === 'undefined' ) continue
            if(!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({text: titleText}),
                image: image
            }))
            collectedIds.push(id)
          }
    }
    return mangaTiles
    }
    parseTags($: CheerioSelector): TagSection[] {
        
        let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
        createTagSection({ id: '1', label: 'format', tags: [] })]
    
        for(let obj of $('a', $('.home-list')).toArray()) {
          let id = $(obj).attr('href')?.replace(`${READCOMICTO_DOMAIN}/`, '').trim() ?? $(obj).text().trim()
          let genre = $(obj).text().trim()
          tagSections[0].tags.push(createTag({id: id, label: genre}))
        }
        tagSections[1].tags.push(createTag({id: 'comic/', label: 'Comic'}))
        return tagSections
    }

    parseHomePageSection($ : CheerioSelector, cheerio:any): MangaTile[]{
        
      let tiles: MangaTile[] = []
      let collectedIds: string[] = []
      for(let obj of $('tr', $('.listing')).toArray()) {
          
          let titleText = this.decodeHTMLEntity($('a',$(obj)).text().replace('\n','').trim())
          let id = $('a',$(obj)).attr('href')?.replace('/Comic/', '')
          if(!titleText) { 
            continue
          
          }
          //Tooltip Selecting 
          let imageCheerio = cheerio.load($('td', $(obj)).first().attr('title') ?? '')
          let image = `${READCOMICTO_DOMAIN}${imageCheerio('img').attr('src')}`

          if (typeof id === 'undefined' || typeof image === 'undefined' ) continue
          if(!collectedIds.includes(id)) {
          tiles.push(createMangaTile({
              id: id,
              title: createIconText({text: titleText}),
              image: image
          }))
          collectedIds.push(id)
        }
  }
  return tiles
    }
    isLastPage($: CheerioSelector): boolean {
      return !$('.pager').text().includes('Next')
    }

    
    decodeHTMLEntity(str: string): string {
        return str.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        })
    }
}
